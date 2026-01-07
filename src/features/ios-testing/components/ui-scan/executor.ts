import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  getSigningConfigFromProject,
  IOS_ERROR_CODES,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import {
  getElementCountsByType,
  parsePageSourceXML,
} from "@/features/ios-testing/lib/xml-parser";
import { saveUIComponentsFromScan } from "@/features/ios-testing/lib/ui-component-service";
import { iosUiScanChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type UiScanData = {
  variableName?: string;
  timeout?: string;
  screenName?: string; // 画面名（UIComponentの分類に使用）
};

const NODE_NAME = "UI Scan";

export const uiScanExecutor: NodeExecutor<UiScanData> = async ({
  data,
  nodeId,
  projectId,
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
      const signingConfig = await getSigningConfigFromProject(projectId, deviceId);
      const sessionResult = await wda.createSession(deviceId, bundleId, signingConfig);
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

      const pageSource = pageSourceResult.data;

      // Parse XML using the new parser
      const parsedElements = parsePageSourceXML(pageSource);
      const elementCounts = getElementCountsByType(parsedElements);
      const accessibilityIds = parsedElements.map((e) => e.accessibilityId);

      // Save to database if projectId is available
      let savedCount = 0;
      if (projectId) {
        savedCount = await saveUIComponentsFromScan({
          projectId,
          elements: parsedElements,
          screenName: data.screenName,
        });
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          pageSource,
          timestamp: new Date().toISOString(),
          stats: {
            totalElements: parsedElements.length,
            elementsByType: elementCounts,
            accessibilityIds,
          },
          // 保存結果のメタデータ
          savedToProject: projectId ? true : false,
          savedCount,
          screenName: data.screenName || null,
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
