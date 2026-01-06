import { NonRetriableError } from "inngest";
import fs from "fs/promises";
import path from "path";
import type { NodeExecutor } from "@/features/executions/types";
import { iosScreenshotChannel } from "@/inngest/channels/ios-testing";
import * as simulator from "@/lib/ios/simulator";
import prisma from "@/lib/db";

type ScreenshotData = {
  variableName?: string;
  filename?: string;
};

export const screenshotExecutor: NodeExecutor<ScreenshotData> = async ({
  data,
  nodeId,
  projectId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosScreenshotChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("take-screenshot", async () => {
      if (!data.variableName) {
        throw new NonRetriableError("Screenshot: Variable name is required");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulatorContext = context.simulator as
        | { deviceId?: string }
        | undefined;
      const deviceId =
        simulatorContext?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Screenshot: No device ID found in context. Ensure Simulator Boot node runs first.",
        );
      }

      // Determine output directory based on project
      let screenshotsDir = "/tmp";
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { projectPath: true },
        });

        if (project?.projectPath) {
          // Get project directory (parent of .xcodeproj/.xcworkspace)
          const projectDir = path.dirname(project.projectPath);
          screenshotsDir = path.join(projectDir, "screenshots");

          // Create screenshots directory if it doesn't exist
          try {
            await fs.mkdir(screenshotsDir, { recursive: true });
          } catch {
            // Fallback to /tmp if cannot create directory
            screenshotsDir = "/tmp";
          }
        }
      }

      // Determine output path
      const timestamp = Date.now();
      const filename = data.filename
        ? (data.filename.endsWith(".png") ? data.filename : `${data.filename}.png`)
        : `screenshot_${timestamp}.png`;
      const outputPath = path.join(screenshotsDir, filename);

      const screenshotResult = await simulator.takeScreenshot(
        deviceId,
        outputPath,
      );

      if (!screenshotResult.success) {
        throw new NonRetriableError(
          "Screenshot failed: Could not capture screenshot from simulator",
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          path: screenshotResult.path,
          filename: data.filename || path.basename(screenshotResult.path),
        },
      };
    });

    await publish(
      iosScreenshotChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosScreenshotChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
