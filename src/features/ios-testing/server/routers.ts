import { exec } from "child_process";
import { promisify } from "util";
import { z } from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { deviceController } from "@/lib/ios";

const execAsync = promisify(exec);

/**
 * Simulator info type
 */
interface SimulatorInfo {
  udid: string;
  name: string;
  state: string;
  runtime: string;
  isAvailable: boolean;
}

/**
 * Unified device info type (for both simulators and physical devices)
 */
interface UnifiedDeviceInfo {
  udid: string;
  name: string;
  state: string;
  osVersion: string;
  deviceType: "simulator" | "physical";
  isAvailable: boolean;
  connectionType?: "usb" | "wifi" | "unknown";
  modelName?: string;
}

/**
 * iOS Testing tRPC Router
 * Provides endpoints for simulator management, UI components, and Golden Masters
 */
export const iosTestingRouter = createTRPCRouter({
  /**
   * List all available iOS devices (simulators and physical devices)
   */
  listAllDevices: protectedProcedure.query(async (): Promise<UnifiedDeviceInfo[]> => {
    try {
      const devices = await deviceController.listAllDevices();
      return devices.map((device): UnifiedDeviceInfo => {
        if (device.deviceType === "physical") {
          return {
            udid: device.udid,
            name: device.name,
            state: device.state,
            osVersion: device.osVersion,
            deviceType: "physical",
            isAvailable: device.state === "connected",
            connectionType: device.connectionType,
            modelName: device.modelName,
          };
        }
        // Simulator
        return {
          udid: device.udid,
          name: device.name,
          state: device.state,
          osVersion: device.runtime,
          deviceType: "simulator",
          isAvailable: device.isAvailable,
        };
      });
    } catch (error) {
      console.error("Failed to list devices:", error);
      return [];
    }
  }),

  /**
   * List available iOS simulators (legacy - kept for backward compatibility)
   */
  listSimulators: protectedProcedure.query(async () => {
    try {
      const { stdout } = await execAsync("xcrun simctl list devices -j", {
        timeout: 10000,
      });
      const data = JSON.parse(stdout);
      const simulators: SimulatorInfo[] = [];

      for (const [runtime, devices] of Object.entries(data.devices)) {
        if (!Array.isArray(devices)) continue;

        for (const device of devices as Array<{
          udid: string;
          name: string;
          state: string;
          isAvailable: boolean;
        }>) {
          if (device.isAvailable) {
            simulators.push({
              udid: device.udid,
              name: device.name,
              state: device.state,
              runtime: runtime.replace(
                /^com\.apple\.CoreSimulator\.SimRuntime\./,
                "",
              ),
              isAvailable: device.isAvailable,
            });
          }
        }
      }

      return simulators;
    } catch (error) {
      console.error("Failed to list simulators:", error);
      return [];
    }
  }),

  /**
   * Update workflow mobile config
   */
  updateMobileConfig: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        targetAppPath: z.string().optional(),
        bundleId: z.string().optional(),
        targetDeviceId: z.string().optional(),
        platform: z.enum(["ios", "android"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { workflowId, ...config } = input;

      return prisma.workflow.update({
        where: {
          id: workflowId,
          userId: ctx.auth.user.id,
        },
        data: config,
      });
    }),

  /**
   * Get workflow mobile config
   */
  getMobileConfig: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workflow = await prisma.workflow.findUnique({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
        select: {
          targetAppPath: true,
          bundleId: true,
          targetDeviceId: true,
          platform: true,
        },
      });

      return workflow;
    }),

  /**
   * Get UI components for a workflow
   */
  getUIComponents: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        sourceFilePath: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify workflow ownership
      await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
      });

      return prisma.uIComponent.findMany({
        where: {
          workflowId: input.workflowId,
          ...(input.sourceFilePath && { sourceFilePath: input.sourceFilePath }),
        },
        orderBy: [{ sourceFilePath: "asc" }, { sourceLineNumber: "asc" }],
      });
    }),

  /**
   * Delete UI components for a workflow
   */
  deleteUIComponents: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        sourceFilePath: z.string().optional(),
        componentIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify workflow ownership
      await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
      });

      if (input.componentIds) {
        return prisma.uIComponent.deleteMany({
          where: {
            workflowId: input.workflowId,
            id: { in: input.componentIds },
          },
        });
      }

      return prisma.uIComponent.deleteMany({
        where: {
          workflowId: input.workflowId,
          ...(input.sourceFilePath && { sourceFilePath: input.sourceFilePath }),
        },
      });
    }),

  /**
   * List source files with components
   */
  listSourceFiles: protectedProcedure
    .input(z.object({ workflowId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify workflow ownership
      await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
      });

      const result = await prisma.uIComponent.groupBy({
        by: ["sourceFilePath"],
        where: {
          workflowId: input.workflowId,
          sourceFilePath: { not: null },
        },
        _count: {
          id: true,
        },
      });

      return result.map((r) => ({
        filePath: r.sourceFilePath,
        componentCount: r._count.id,
      }));
    }),

  /**
   * Create Golden Master image
   */
  createGoldenMaster: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        nodeId: z.string(),
        name: z.string(),
        imageUrl: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify workflow ownership
      await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
      });

      return prisma.goldenMaster.create({
        data: {
          workflowId: input.workflowId,
          nodeId: input.nodeId,
          name: input.name,
          imageUrl: input.imageUrl,
        },
      });
    }),

  /**
   * Get Golden Masters for a workflow
   */
  getGoldenMasters: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        nodeId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify workflow ownership
      await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
      });

      return prisma.goldenMaster.findMany({
        where: {
          workflowId: input.workflowId,
          ...(input.nodeId && { nodeId: input.nodeId }),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  /**
   * Delete Golden Master
   */
  deleteGoldenMaster: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const goldenMaster = await prisma.goldenMaster.findUnique({
        where: { id: input.id },
        include: { workflow: true },
      });

      if (!goldenMaster || goldenMaster.workflow.userId !== ctx.auth.user.id) {
        throw new Error("Golden master not found");
      }

      return prisma.goldenMaster.delete({
        where: { id: input.id },
      });
    }),

  /**
   * Update Golden Master
   */
  updateGoldenMaster: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        imageUrl: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const goldenMaster = await prisma.goldenMaster.findUnique({
        where: { id },
        include: { workflow: true },
      });

      if (!goldenMaster || goldenMaster.workflow.userId !== ctx.auth.user.id) {
        throw new Error("Golden master not found");
      }

      return prisma.goldenMaster.update({
        where: { id },
        data,
      });
    }),
});
