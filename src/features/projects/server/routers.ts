/**
 * Project Router
 * tRPC endpoints for project management
 */

import { z } from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { PAGINATION } from "@/config/constants";
import {
  detectXcodeProject,
  extractBundleId,
  findSwiftUIFiles,
  findBuiltApp,
  getProjectInfo,
  validateXcodeProject,
  getProjectDirectory,
} from "@/lib/ios/xcode-project";
import { listSimulators } from "@/lib/ios/simulator";

export const projectsRouter = createTRPCRouter({
  /**
   * List all projects for the current user
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { page, pageSize, search } = input;

      const [items, totalCount] = await Promise.all([
        prisma.project.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            userId: ctx.auth.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
          include: {
            _count: {
              select: {
                workflows: true,
                templates: true,
                uiComponents: true,
              },
            },
          },
        }),
        prisma.project.count({
          where: {
            userId: ctx.auth.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),

  /**
   * Get a single project by ID
   */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.project.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        include: {
          workflows: {
            orderBy: { updatedAt: "desc" },
            take: 10,
          },
          templates: {
            orderBy: { createdAt: "desc" },
          },
          uiComponents: {
            orderBy: { createdAt: "desc" },
          },
          _count: {
            select: {
              workflows: true,
              templates: true,
              uiComponents: true,
            },
          },
        },
      });
    }),

  /**
   * Create a new project from an Xcode project path
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        projectPath: z.string().min(1),
        targetDeviceId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { name, projectPath, targetDeviceId } = input;

      // Validate the project path
      const validation = await validateXcodeProject(projectPath);
      if (!validation.valid) {
        throw new Error(`Invalid project path: ${validation.error}`);
      }

      // Extract project information
      const bundleId = await extractBundleId(projectPath);
      const appPath = await findBuiltApp(projectPath);

      // Create the project
      const project = await prisma.project.create({
        data: {
          name,
          projectPath,
          bundleId,
          targetDeviceId,
          appPath,
          userId: ctx.auth.user.id,
        },
      });

      // Auto-detect SwiftUI files and create UIComponents
      const projectDir = getProjectDirectory(projectPath);
      const swiftUIFiles = await findSwiftUIFiles(projectDir);

      // Note: Full UIComponent analysis would be done by swift-analyzer
      // For now, just store the file paths
      if (swiftUIFiles.length > 0) {
        await prisma.uIComponent.createMany({
          data: swiftUIFiles.slice(0, 100).map((filePath) => ({
            projectId: project.id,
            accessibilityId: `file:${filePath}`,
            componentType: "SwiftUIFile",
            sourceFilePath: filePath,
            label: filePath.split("/").pop() || filePath,
          })),
        });
      }

      return project;
    }),

  /**
   * Update project settings
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        projectPath: z.string().optional(),
        bundleId: z.string().optional(),
        targetDeviceId: z.string().optional(),
        appPath: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // If projectPath is being updated, validate it
      if (data.projectPath) {
        const validation = await validateXcodeProject(data.projectPath);
        if (!validation.valid) {
          throw new Error(`Invalid project path: ${validation.error}`);
        }
      }

      return prisma.project.update({
        where: {
          id,
          userId: ctx.auth.user.id,
        },
        data,
      });
    }),

  /**
   * Delete a project
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.project.delete({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
    }),

  /**
   * Detect Xcode project at a given path
   */
  detectProject: protectedProcedure
    .input(z.object({ directoryPath: z.string() }))
    .query(async ({ input }) => {
      const detection = await detectXcodeProject(input.directoryPath);

      if (!detection.path) {
        return {
          found: false,
          type: null,
          path: null,
          name: null,
          info: null,
        };
      }

      const info = await getProjectInfo(detection.path);

      return {
        found: true,
        type: detection.type,
        path: detection.path,
        name: detection.name,
        info: {
          bundleId: info.bundleId,
          schemes: info.schemes,
          targets: info.targets,
          swiftFileCount: info.swiftFiles.length,
          hasSwiftUI: info.hasSwiftUI,
        },
      };
    }),

  /**
   * Rescan project to update UIComponents
   */
  rescan: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });

      // Update Bundle ID and app path
      const bundleId = await extractBundleId(project.projectPath);
      const appPath = await findBuiltApp(project.projectPath);

      await prisma.project.update({
        where: { id: project.id },
        data: { bundleId, appPath },
      });

      // Re-detect SwiftUI files
      const projectDir = getProjectDirectory(project.projectPath);
      const swiftUIFiles = await findSwiftUIFiles(projectDir);

      // Remove old SwiftUI file entries
      await prisma.uIComponent.deleteMany({
        where: {
          projectId: project.id,
          componentType: "SwiftUIFile",
        },
      });

      // Create new entries
      if (swiftUIFiles.length > 0) {
        await prisma.uIComponent.createMany({
          data: swiftUIFiles.slice(0, 100).map((filePath) => ({
            projectId: project.id,
            accessibilityId: `file:${filePath}`,
            componentType: "SwiftUIFile",
            sourceFilePath: filePath,
            label: filePath.split("/").pop() || filePath,
          })),
        });
      }

      return {
        bundleId,
        appPath,
        swiftUIFileCount: swiftUIFiles.length,
      };
    }),

  /**
   * Get available simulators
   */
  listSimulators: protectedProcedure.query(async () => {
    const simulators = await listSimulators();
    return simulators;
  }),

  /**
   * Get project workflows
   */
  getWorkflows: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { projectId, page, pageSize } = input;

      // Verify project ownership
      await prisma.project.findUniqueOrThrow({
        where: {
          id: projectId,
          userId: ctx.auth.user.id,
        },
      });

      const [items, totalCount] = await Promise.all([
        prisma.workflow.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            projectId,
            userId: ctx.auth.user.id,
          },
          orderBy: { updatedAt: "desc" },
        }),
        prisma.workflow.count({
          where: {
            projectId,
            userId: ctx.auth.user.id,
          },
        }),
      ]);

      const totalPages = Math.ceil(totalCount / pageSize);

      return {
        items,
        page,
        pageSize,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    }),

  /**
   * Get project UI components
   */
  getUIComponents: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        componentType: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { projectId, componentType } = input;

      // Verify project ownership
      await prisma.project.findUniqueOrThrow({
        where: {
          id: projectId,
          userId: ctx.auth.user.id,
        },
      });

      return prisma.uIComponent.findMany({
        where: {
          projectId,
          ...(componentType && { componentType }),
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
