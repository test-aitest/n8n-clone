import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosScreenshotChannel } from "@/inngest/channels/ios-testing";
import * as simulator from "@/lib/ios/simulator";
import path from "path";

type ScreenshotData = {
  variableName?: string;
  filename?: string;
};

export const screenshotExecutor: NodeExecutor<ScreenshotData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosScreenshotChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("take-screenshot", async () => {
      if (!data.variableName) {
        throw new NonRetriableError("Screenshot: Variable name is required");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulatorContext = context.simulator as { deviceId?: string } | undefined;
      const deviceId = simulatorContext?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Screenshot: No device ID found in context. Ensure Simulator Boot node runs first."
        );
      }

      // Determine output path
      let outputPath: string | undefined;
      if (data.filename) {
        // Ensure the filename ends with .png
        const filename = data.filename.endsWith(".png")
          ? data.filename
          : `${data.filename}.png`;
        outputPath = path.join("/tmp", filename);
      }

      const screenshotResult = await simulator.takeScreenshot(deviceId, outputPath);

      if (!screenshotResult.success) {
        throw new NonRetriableError(
          "Screenshot failed: Could not capture screenshot from simulator"
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
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosScreenshotChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
