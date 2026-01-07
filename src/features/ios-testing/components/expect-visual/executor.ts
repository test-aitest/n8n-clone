import { readFile } from "fs/promises";
import { NonRetriableError } from "inngest";
import path from "path";
import type { NodeExecutor } from "@/features/executions/types";
import { getDeviceIdFromContext } from "@/features/ios-testing/lib/errors";
import { iosExpectVisualChannel } from "@/inngest/channels/ios-testing";
import { deviceController } from "@/lib/ios";
import { takeScreenshot } from "@/lib/ios/simulator";
import * as wda from "@/lib/ios/wda";
import {
  compareImages,
  compareWithGoldenMaster,
  createGoldenMaster,
} from "@/lib/visual/pixelmatch";

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
    }),
  );

  try {
    const result = await step.run("expect-visual", async () => {
      if (!data.variableName) {
        throw new NonRetriableError("Expect Visual: Variable name is required");
      }

      // Get device ID from context (works for both simulator and physical device flows)
      const deviceId = getDeviceIdFromContext(context, "Expect Visual");

      const threshold = data.threshold ? parseFloat(data.threshold) : 0.1;

      if (threshold < 0 || threshold > 1) {
        throw new NonRetriableError(
          "Expect Visual: Threshold must be between 0 and 1",
        );
      }

      // Check if this is a physical device
      const isPhysical = await deviceController.isPhysicalDeviceByUdid(deviceId);

      let screenshotBuffer: Buffer;
      let screenshotPath: string;

      if (isPhysical) {
        // For physical devices, use WDA to take screenshot
        const wdaResult = await wda.takeScreenshot(deviceId);
        if (!wdaResult.success || !wdaResult.data) {
          throw new NonRetriableError(
            "Expect Visual: Failed to take screenshot from physical device. Make sure an Appium session is active.",
          );
        }
        screenshotBuffer = Buffer.from(wdaResult.data, "base64");
        screenshotPath = `/tmp/visual-tests/screenshot_${Date.now()}.png`;
      } else {
        // For simulators, use simctl
        const screenshotResult = await takeScreenshot(deviceId);
        if (!screenshotResult.success || !screenshotResult.buffer) {
          throw new NonRetriableError("Expect Visual: Failed to take screenshot");
        }
        screenshotBuffer = screenshotResult.buffer;
        screenshotPath = screenshotResult.path;
      }

      // If createBaseline is true, save as new baseline
      if (data.createBaseline) {
        const baselineName = data.baselineName || `baseline_${nodeId}`;
        const baselineDir = path.join(VISUAL_ARTIFACTS_DIR, "baselines");
        const baselineResult = await createGoldenMaster(
          screenshotBuffer,
          baselineDir,
          baselineName,
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
          },
        );

        if (comparisonResult.error) {
          throw new NonRetriableError(
            `Expect Visual: ${comparisonResult.error}`,
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
            `Expect Visual: Failed to read baseline image: ${data.baselineImage}`,
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
          },
        );

        if (comparisonResult.error) {
          throw new NonRetriableError(
            `Expect Visual: ${comparisonResult.error}`,
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
        "Expect Visual: Either baselineImage, goldenMasterUrl, or createBaseline must be specified",
      );
    });

    await publish(
      iosExpectVisualChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosExpectVisualChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
