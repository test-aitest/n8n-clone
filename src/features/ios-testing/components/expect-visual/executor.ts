import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosExpectVisualChannel } from "@/inngest/channels/ios-testing";
import { takeScreenshot } from "@/lib/ios/simulator";
import {
  compareImages,
  compareWithGoldenMaster,
  createGoldenMaster,
} from "@/lib/visual/pixelmatch";
import { readFile } from "fs/promises";
import path from "path";

// Directory for storing visual test artifacts
const VISUAL_ARTIFACTS_DIR = "/tmp/visual-tests";

type ExpectVisualData = {
  variableName?: string;
  baselineImage?: string;
  goldenMasterId?: string;
  goldenMasterUrl?: string;
  threshold?: string;
  timeout?: string;
  saveOnMismatch?: boolean;
  createBaseline?: boolean;
  baselineName?: string;
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
      if (!data.variableName) {
        throw new NonRetriableError(
          "Expect Visual: Variable name is required"
        );
      }

      // Get device ID from context
      const simulator = context.simulator as { deviceId?: string } | undefined;
      const deviceId =
        simulator?.deviceId || (context.deviceId as string | undefined);
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

      // Take screenshot of current simulator state
      const screenshotResult = await takeScreenshot(deviceId);

      if (!screenshotResult.success || !screenshotResult.buffer) {
        throw new NonRetriableError(
          "Expect Visual: Failed to take screenshot"
        );
      }

      const screenshotBuffer = screenshotResult.buffer;
      const screenshotPath = screenshotResult.path;

      // If createBaseline is true, save as new baseline
      if (data.createBaseline) {
        const baselineName = data.baselineName || `baseline_${nodeId}`;
        const baselineDir = path.join(VISUAL_ARTIFACTS_DIR, "baselines");
        const baselineResult = await createGoldenMaster(
          screenshotBuffer,
          baselineDir,
          baselineName
        );

        return {
          ...context,
          [data.variableName]: {
            success: true,
            action: "created_baseline",
            baselinePath: baselineResult.path,
            dimensions: baselineResult.dimensions,
            message: `Created new baseline: ${baselineName}`,
          },
        };
      }

      // Compare with Golden Master URL (from database)
      if (data.goldenMasterUrl) {
        const comparisonResult = await compareWithGoldenMaster(
          screenshotBuffer,
          data.goldenMasterUrl,
          {
            threshold,
            generateDiff: true,
            saveDiff: data.saveOnMismatch ?? true,
            diffOutputDir: path.join(VISUAL_ARTIFACTS_DIR, "diffs"),
            diffFileName: `diff_${nodeId}`,
          }
        );

        if (comparisonResult.error) {
          throw new NonRetriableError(
            `Expect Visual: ${comparisonResult.error}`
          );
        }

        return {
          ...context,
          [data.variableName]: {
            success: true,
            passed: comparisonResult.passed,
            diffPercent: comparisonResult.diffPercent,
            diffPixelCount: comparisonResult.diffPixelCount,
            totalPixels: comparisonResult.totalPixels,
            dimensions: comparisonResult.dimensions,
            threshold,
            screenshotPath,
            diffImagePath: comparisonResult.diffImagePath,
            goldenMasterUrl: data.goldenMasterUrl,
            message: comparisonResult.passed
              ? `Visual comparison passed (${comparisonResult.diffPercent}% diff)`
              : `Visual comparison failed: ${comparisonResult.diffPercent}% pixels differ (threshold: ${threshold * 100}%)`,
          },
        };
      }

      // Compare with local baseline image
      if (data.baselineImage) {
        let baselineBuffer: Buffer;
        try {
          baselineBuffer = await readFile(data.baselineImage);
        } catch (error) {
          throw new NonRetriableError(
            `Expect Visual: Failed to read baseline image: ${data.baselineImage}`
          );
        }

        const comparisonResult = await compareImages(
          screenshotBuffer,
          baselineBuffer,
          {
            threshold,
            generateDiff: true,
            saveDiff: data.saveOnMismatch ?? true,
            diffOutputDir: path.join(VISUAL_ARTIFACTS_DIR, "diffs"),
            diffFileName: `diff_${nodeId}`,
          }
        );

        if (comparisonResult.error) {
          throw new NonRetriableError(
            `Expect Visual: ${comparisonResult.error}`
          );
        }

        return {
          ...context,
          [data.variableName]: {
            success: true,
            passed: comparisonResult.passed,
            diffPercent: comparisonResult.diffPercent,
            diffPixelCount: comparisonResult.diffPixelCount,
            totalPixels: comparisonResult.totalPixels,
            dimensions: comparisonResult.dimensions,
            threshold,
            screenshotPath,
            baselineImage: data.baselineImage,
            diffImagePath: comparisonResult.diffImagePath,
            message: comparisonResult.passed
              ? `Visual comparison passed (${comparisonResult.diffPercent}% diff)`
              : `Visual comparison failed: ${comparisonResult.diffPercent}% pixels differ (threshold: ${threshold * 100}%)`,
          },
        };
      }

      throw new NonRetriableError(
        "Expect Visual: Either baselineImage, goldenMasterUrl, or createBaseline must be specified"
      );
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
