import { z } from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { PAGINATION } from "@/config/constants";
import { ExecutionMode } from "@/generated/prisma/client";
import { sendPackageExecution } from "@/inngest/utils";

export const packagesRouter = createTRPCRouter({
  /**
   * Create a new package
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        projectId: z.string(),
        executionMode: z.enum(["PARALLEL", "SEQUENTIAL"]).default("SEQUENTIAL"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      await prisma.project.findUniqueOrThrow({
        where: {
          id: input.projectId,
          userId: ctx.auth.user.id,
        },
      });

      return prisma.package.create({
        data: {
          name: input.name,
          description: input.description,
          projectId: input.projectId,
          userId: ctx.auth.user.id,
          executionMode: input.executionMode as ExecutionMode,
        },
      });
    }),

  /**
   * Get packages for a project
   */
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        page: z.number().default(PAGINATION.DEFAULT_PAGE),
        pageSize: z
          .number()
          .min(PAGINATION.MIN_PAGE_SIZE)
          .max(PAGINATION.MAX_PAGE_SIZE)
          .default(PAGINATION.DEFAULT_PAGE_SIZE),
        search: z.string().default(""),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projectId, page, pageSize, search } = input;

      const [items, totalCount] = await Promise.all([
        prisma.package.findMany({
          skip: (page - 1) * pageSize,
          take: pageSize,
          where: {
            projectId,
            userId: ctx.auth.user.id,
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
          include: {
            workflows: {
              include: {
                workflow: {
                  select: {
                    id: true,
                    name: true,
                    targetDeviceId: true,
                  },
                },
              },
              orderBy: {
                order: "asc",
              },
            },
            _count: {
              select: {
                workflows: true,
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        prisma.package.count({
          where: {
            projectId,
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
   * Get a single package with its workflows
   */
  getOne: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return prisma.package.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        include: {
          project: true,
          workflows: {
            include: {
              workflow: {
                select: {
                  id: true,
                  name: true,
                  targetDeviceId: true,
                  updatedAt: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      });
    }),

  /**
   * Update package details
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        executionMode: z.enum(["PARALLEL", "SEQUENTIAL"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      return prisma.package.update({
        where: {
          id,
          userId: ctx.auth.user.id,
        },
        data: {
          ...data,
          executionMode: data.executionMode as ExecutionMode | undefined,
        },
      });
    }),

  /**
   * Delete a package
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return prisma.package.delete({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
      });
    }),

  /**
   * Add a workflow to a package
   */
  addWorkflow: protectedProcedure
    .input(
      z.object({
        packageId: z.string(),
        workflowId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify package ownership
      const pkg = await prisma.package.findUniqueOrThrow({
        where: {
          id: input.packageId,
          userId: ctx.auth.user.id,
        },
      });

      // Verify workflow exists and belongs to the same project
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: {
          id: input.workflowId,
          userId: ctx.auth.user.id,
        },
      });

      if (workflow.projectId !== pkg.projectId) {
        throw new Error("Workflow must belong to the same project as the package");
      }

      // Get the max order
      const maxOrder = await prisma.packageWorkflow.aggregate({
        where: { packageId: input.packageId },
        _max: { order: true },
      });

      return prisma.packageWorkflow.create({
        data: {
          packageId: input.packageId,
          workflowId: input.workflowId,
          order: (maxOrder._max.order ?? -1) + 1,
        },
      });
    }),

  /**
   * Remove a workflow from a package
   */
  removeWorkflow: protectedProcedure
    .input(
      z.object({
        packageId: z.string(),
        workflowId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify package ownership
      await prisma.package.findUniqueOrThrow({
        where: {
          id: input.packageId,
          userId: ctx.auth.user.id,
        },
      });

      return prisma.packageWorkflow.delete({
        where: {
          packageId_workflowId: {
            packageId: input.packageId,
            workflowId: input.workflowId,
          },
        },
      });
    }),

  /**
   * Validate parallel execution (check for duplicate simulator IDs)
   */
  validateParallel: protectedProcedure
    .input(z.object({ packageId: z.string() }))
    .query(async ({ ctx, input }) => {
      const pkg = await prisma.package.findUniqueOrThrow({
        where: {
          id: input.packageId,
          userId: ctx.auth.user.id,
        },
        include: {
          workflows: {
            include: {
              workflow: {
                select: {
                  id: true,
                  name: true,
                  targetDeviceId: true,
                },
              },
            },
          },
        },
      });

      // Find duplicate simulator IDs
      const deviceIdMap = new Map<string, string[]>();
      for (const pw of pkg.workflows) {
        const deviceId = pw.workflow.targetDeviceId;
        if (deviceId) {
          const existing = deviceIdMap.get(deviceId) || [];
          existing.push(pw.workflow.name);
          deviceIdMap.set(deviceId, existing);
        }
      }

      const duplicates: { deviceId: string; workflowNames: string[] }[] = [];
      for (const [deviceId, names] of deviceIdMap) {
        if (names.length > 1) {
          duplicates.push({ deviceId, workflowNames: names });
        }
      }

      return {
        isValid: duplicates.length === 0,
        duplicates,
      };
    }),

  /**
   * Execute all workflows in a package
   */
  execute: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pkg = await prisma.package.findUniqueOrThrow({
        where: {
          id: input.id,
          userId: ctx.auth.user.id,
        },
        include: {
          workflows: {
            include: {
              workflow: {
                select: {
                  id: true,
                  targetDeviceId: true,
                },
              },
            },
            orderBy: {
              order: "asc",
            },
          },
        },
      });

      // Validate parallel execution
      if (pkg.executionMode === "PARALLEL") {
        const deviceIds = pkg.workflows
          .map((pw) => pw.workflow.targetDeviceId)
          .filter(Boolean);
        const uniqueDeviceIds = new Set(deviceIds);

        if (deviceIds.length !== uniqueDeviceIds.size) {
          throw new Error(
            "Cannot execute in parallel: Multiple workflows use the same simulator. Please change execution mode to sequential or use different simulators."
          );
        }
      }

      if (pkg.workflows.length === 0) {
        throw new Error("Package has no workflows to execute");
      }

      // Send package execution event
      await sendPackageExecution({
        packageId: pkg.id,
        executionMode: pkg.executionMode,
        workflowIds: pkg.workflows.map((pw) => pw.workflow.id),
      });

      return pkg;
    }),

  /**
   * Get all packages for the user (across all projects)
   */
  getAllPackages: protectedProcedure.query(async ({ ctx }) => {
    return prisma.package.findMany({
      where: {
        userId: ctx.auth.user.id,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            workflows: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }),
});
