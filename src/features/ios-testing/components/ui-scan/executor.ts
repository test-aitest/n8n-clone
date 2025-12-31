import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  IOS_ERROR_CODES,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import { iosUiScanChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type UiScanData = {
  variableName?: string;
  timeout?: string;
};

const NODE_NAME = "UI Scan";

export const uiScanExecutor: NodeExecutor<UiScanData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosUiScanChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("ui-scan", async () => {
      // Validate required fields
      validateRequired(data, ["variableName"], NODE_NAME);

      // Get device ID and bundle ID from context
      const deviceId = getDeviceIdFromContext(context, NODE_NAME);
      const bundleId = getBundleIdFromContext(context, NODE_NAME);

      // Ensure Appium is running
      const appiumRunning = await wda.isAppiumRunning();
      if (!appiumRunning) {
        throw createIOSError(
          IOS_ERROR_CODES.COMMAND_FAILED,
          `${NODE_NAME} failed: Appium server is not running. Start Appium with 'appium' command.`,
        );
      }

      // Ensure we have bundleId
      if (!bundleId) {
        throw createIOSError(
          IOS_ERROR_CODES.MISSING_REQUIRED_FIELD,
          `${NODE_NAME} failed: No bundle ID found. Ensure App Launch node runs first.`,
        );
      }

      // Create or reuse WDA session
      const sessionResult = await wda.createSession(deviceId, bundleId);
      if (!sessionResult.success) {
        throw createIOSError(
          IOS_ERROR_CODES.COMMAND_FAILED,
          `${NODE_NAME} failed: Could not create WDA session: ${sessionResult.error}`,
        );
      }

      // Get the complete UI hierarchy (page source XML)
      const pageSourceResult = await wda.getPageSource(deviceId);

      if (!pageSourceResult.success || !pageSourceResult.data) {
        throw createIOSError(
          IOS_ERROR_CODES.COMMAND_FAILED,
          `${NODE_NAME} failed: Could not get page source: ${pageSourceResult.error}`,
        );
      }

      // Parse XML to extract accessibility identifiers
      const pageSource = pageSourceResult.data;

      // Extract accessibility identifiers from XML
      const accessibilityIds: string[] = [];
      const nameMatches = pageSource.matchAll(/name="([^"]+)"/g);
      for (const match of nameMatches) {
        if (match[1] && !accessibilityIds.includes(match[1])) {
          accessibilityIds.push(match[1]);
        }
      }

      // Count elements by type
      const elementCounts: Record<string, number> = {};
      const typeMatches = pageSource.matchAll(/<XCUIElementType(\w+)/g);
      for (const match of typeMatches) {
        const type = match[1];
        elementCounts[type] = (elementCounts[type] || 0) + 1;
      }

      // Calculate total
      const totalElements = Object.values(elementCounts).reduce(
        (sum, count) => sum + count,
        0,
      );

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          pageSource,
          timestamp: new Date().toISOString(),
          stats: {
            totalElements,
            elementsByType: elementCounts,
            accessibilityIds,
          },
        },
      };
    });

    await publish(
      iosUiScanChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosUiScanChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
