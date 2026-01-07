import fs from "fs/promises";
import { NonRetriableError } from "inngest";
import path from "path";
import type { NodeExecutor } from "@/features/executions/types";
import { getDeviceIdFromContext } from "@/features/ios-testing/lib/errors";
import { iosScreenshotChannel } from "@/inngest/channels/ios-testing";
import * as simulator from "@/lib/ios/simulator";
import * as wda from "@/lib/ios/wda";
import { deviceController } from "@/lib/ios";
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

      // Get the device ID from context (works for both simulator and physical device flows)
      const deviceId = getDeviceIdFromContext(context, "Screenshot");

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

      // Check if this is a physical device
      const isPhysical = await deviceController.isPhysicalDeviceByUdid(deviceId);

      let screenshotPath: string;

      if (isPhysical) {
        // For physical devices, use WDA (Appium) to take screenshot
        // This returns a base64 encoded PNG
        const wdaResult = await wda.takeScreenshot(deviceId);
        if (!wdaResult.success || !wdaResult.data) {
          throw new NonRetriableError(
            "Screenshot failed: Could not capture screenshot from physical device. Make sure an Appium session is active.",
          );
        }

        // Write base64 data to file
        const imageBuffer = Buffer.from(wdaResult.data, "base64");
        await fs.writeFile(outputPath, imageBuffer);
        screenshotPath = outputPath;
      } else {
        // For simulators, use simctl
        const screenshotResult = await simulator.takeScreenshot(
          deviceId,
          outputPath,
        );

        if (!screenshotResult.success) {
          throw new NonRetriableError(
            "Screenshot failed: Could not capture screenshot from simulator",
          );
        }
        screenshotPath = screenshotResult.path;
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          path: screenshotPath,
          filename: data.filename || path.basename(screenshotPath),
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
