import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosExpectVisualChannel } from "@/inngest/channels/ios-testing";

// Note: This executor is stubbed. Full implementation would require:
// - pixelmatch package for image comparison
// - Sharp or jimp for image processing
// - Screenshot capture from simulator

type ExpectVisualData = {
  variableName?: string;
  baselineImage?: string;
  threshold?: string;
  timeout?: string;
};

export const expectVisualExecutor: NodeExecutor<ExpectVisualData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosExpectVisualChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("expect-visual", async () => {
      if (!data.baselineImage) {
        throw new NonRetriableError("Expect Visual: Baseline image path is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Expect Visual: Variable name is required");
      }

      // Get device ID from context (should be set by simulator boot node)
      const simulator = context.simulator as { deviceId?: string } | undefined;
      const deviceId = simulator?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Expect Visual: No device ID found. Make sure simulator is booted first."
        );
      }

      const threshold = data.threshold ? parseFloat(data.threshold) : 0.1;

      if (threshold < 0 || threshold > 1) {
        throw new NonRetriableError(
          "Expect Visual: Threshold must be between 0 and 1"
        );
      }

      // TODO: Implement actual visual comparison
      // 1. Take screenshot of current simulator state
      //    const screenshotPath = await simulator.takeScreenshot(deviceId);
      //
      // 2. Load baseline image
      //    const baselineBuffer = await fs.readFile(data.baselineImage);
      //
      // 3. Compare using pixelmatch
      //    const { PNG } = require('pngjs');
      //    const pixelmatch = require('pixelmatch');
      //
      //    const baseline = PNG.sync.read(baselineBuffer);
      //    const current = PNG.sync.read(currentBuffer);
      //    const diff = new PNG({ width: baseline.width, height: baseline.height });
      //
      //    const numDiffPixels = pixelmatch(
      //      baseline.data, current.data, diff.data,
      //      baseline.width, baseline.height,
      //      { threshold: 0.1 }
      //    );
      //
      //    const diffRatio = numDiffPixels / (baseline.width * baseline.height);
      //    const matches = diffRatio <= threshold;
      //
      // 4. Save diff image for debugging if there's a mismatch

      // Stub implementation - always passes
      // Remove this stub when implementing actual visual comparison
      console.log(
        `[STUB] Expect Visual: Would compare screenshot with ${data.baselineImage} (threshold: ${threshold})`
      );

      return {
        ...context,
        [data.variableName]: {
          success: true,
          matches: true,
          baselineImage: data.baselineImage,
          threshold,
          diffRatio: 0,
          // screenshotPath: null,
          // diffImagePath: null,
          stub: true,
          message: "Visual comparison not yet implemented - stub always passes",
        },
      };
    });

    await publish(
      iosExpectVisualChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosExpectVisualChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
