/**
 * UIComponent Save Service
 * Handles saving UI Scan results to the database
 */

import prisma from "@/lib/db";
import type { ParsedUIElement } from "./xml-parser";

export interface SaveUIComponentsParams {
  projectId: string;
  elements: ParsedUIElement[];
  screenName?: string; // Optional: track which screen these came from
}

/**
 * Save UI components from scan to the database
 * Uses upsert to avoid duplicates based on projectId + accessibilityId
 */
export async function saveUIComponentsFromScan({
  projectId,
  elements,
  screenName,
}: SaveUIComponentsParams): Promise<number> {
  if (!projectId || elements.length === 0) {
    return 0;
  }

  // Use upsert to avoid duplicates - key is projectId + accessibilityId
  const operations = elements.map((element) =>
    prisma.uIComponent.upsert({
      where: {
        projectId_accessibilityId: {
          projectId,
          accessibilityId: element.accessibilityId,
        },
      },
      update: {
        componentType: element.componentType,
        label: element.label,
        positionX: element.positionX,
        positionY: element.positionY,
        sourceFilePath: screenName || undefined,
      },
      create: {
        projectId,
        accessibilityId: element.accessibilityId,
        componentType: element.componentType,
        label: element.label,
        positionX: element.positionX,
        positionY: element.positionY,
        sourceFilePath: screenName,
      },
    })
  );

  await prisma.$transaction(operations);

  // Also create/update the screen entry if screenName is provided
  if (screenName) {
    await prisma.projectScreen.upsert({
      where: {
        projectId_filePath: {
          projectId,
          filePath: screenName,
        },
      },
      update: {
        // Keep existing screenName if already set
      },
      create: {
        projectId,
        filePath: screenName,
        screenName: screenName, // Default to same as filePath
      },
    });
  }

  return elements.length;
}

/**
 * Get all screens for a project with their element counts
 */
export async function getProjectScreens(projectId: string) {
  // Get screens from ProjectScreen table
  const screens = await prisma.projectScreen.findMany({
    where: { projectId },
    orderBy: { screenName: "asc" },
  });

  // Also get unique sourceFilePath from UIComponents that don't have a ProjectScreen entry
  const componentsWithPaths = await prisma.uIComponent.findMany({
    where: {
      projectId,
      sourceFilePath: { not: null },
    },
    select: {
      sourceFilePath: true,
    },
    distinct: ["sourceFilePath"],
  });

  // Get element counts per screen
  const screenPaths = screens.map((s) => s.filePath);
  const componentPaths = componentsWithPaths
    .map((c) => c.sourceFilePath)
    .filter((p): p is string => p !== null && !screenPaths.includes(p));

  // Merge screens with component paths
  const allScreens = [
    ...screens.map((s) => ({
      filePath: s.filePath,
      screenName: s.screenName,
      isCustomName: s.filePath !== s.screenName,
    })),
    ...componentPaths.map((path) => ({
      filePath: path,
      screenName: path,
      isCustomName: false,
    })),
  ];

  return allScreens;
}
