import { z } from "zod";
import prisma from "@/lib/db";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";

export const projectScreensRouter = createTRPCRouter({
  /**
   * Get all screens for a project (with search support)
   */
  getMany: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        search: z.string().optional().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { projectId } = input;
      const search = input.search || undefined;

      try {
        // Verify project ownership
        await prisma.project.findUniqueOrThrow({
          where: {
            id: projectId,
            userId: ctx.auth.user.id,
          },
        });

        // Get screens from ProjectScreen table
        const allProjectScreens = await prisma.projectScreen.findMany({
          where: {
            projectId,
          },
          orderBy: { screenName: "asc" },
        });

        // Filter by search term (match against screenName or filename from filePath)
        const screens = search
          ? allProjectScreens.filter((s) => {
              const fileName = s.filePath.split("/").pop() || s.filePath;
              const searchLower = search.toLowerCase();
              return (
                s.screenName.toLowerCase().includes(searchLower) ||
                fileName.toLowerCase().includes(searchLower)
              );
            })
          : allProjectScreens;

        // Also get unique sourceFilePath from UIComponents that don't have a ProjectScreen entry
        const allComponentsWithPaths = await prisma.uIComponent.findMany({
          where: {
            projectId,
            sourceFilePath: { not: null },
          },
          select: {
            sourceFilePath: true,
          },
          distinct: ["sourceFilePath"],
        });

        // Filter by search term (match against filename only)
        const componentsWithPaths = search
          ? allComponentsWithPaths.filter((c) => {
              if (!c.sourceFilePath) return false;
              const fileName = c.sourceFilePath.split("/").pop() || c.sourceFilePath;
              return fileName.toLowerCase().includes(search.toLowerCase());
            })
          : allComponentsWithPaths;

        // Get screen paths that already have entries
        const screenPaths = new Set(screens.map((s) => s.filePath));

        // Add component paths that don't have screen entries
        const additionalScreens = componentsWithPaths
          .map((c) => c.sourceFilePath)
          .filter((p): p is string => p !== null && !screenPaths.has(p))
          .map((path) => {
            // Extract just the filename from the full path
            const fileName = path.split("/").pop() || path;
            return {
              id: `temp-${path}`,
              filePath: path,
              screenName: fileName, // Show only filename
              isCustomName: false,
              projectId,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          });

        // Merge and return all screens
        const allScreens = [
          ...screens.map((s) => ({
            ...s,
            isCustomName: s.filePath !== s.screenName,
          })),
          ...additionalScreens,
        ];

        // Get element counts per screen
        const elementCounts = await prisma.uIComponent.groupBy({
          by: ["sourceFilePath"],
          where: {
            projectId,
            sourceFilePath: { not: null },
          },
          _count: {
            _all: true,
          },
        });

        const countMap = new Map(
          elementCounts.map((c) => [c.sourceFilePath, c._count._all])
        );

        return allScreens.map((screen) => ({
          ...screen,
          elementCount: countMap.get(screen.filePath) || 0,
        }));
      } catch (error) {
        console.error("[projectScreens.getMany] Error:", error);
        throw error;
      }
    }),

  /**
   * Upsert a screen name (create or update)
   */
  upsert: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        filePath: z.string(),
        screenName: z.string().min(1),
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

      return prisma.projectScreen.upsert({
        where: {
          projectId_filePath: {
            projectId: input.projectId,
            filePath: input.filePath,
          },
        },
        update: {
          screenName: input.screenName,
        },
        create: {
          projectId: input.projectId,
          filePath: input.filePath,
          screenName: input.screenName,
        },
      });
    }),

  /**
   * Delete a screen
   */
  delete: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        filePath: z.string(),
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

      return prisma.projectScreen.delete({
        where: {
          projectId_filePath: {
            projectId: input.projectId,
            filePath: input.filePath,
          },
        },
      });
    }),
});
