import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  formatErrorForDisplay,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  getSigningConfigFromProject,
  IOS_ERROR_CODES,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import { iosTapChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type TapData = {
  variableName?: string;
  elementType?: string;
  accessibilityId?: string;
  labelMatch?: string;
};

const NODE_NAME = "Tap";

export const tapExecutor: NodeExecutor<TapData> = async ({
  data,
  nodeId,
  projectId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosTapChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("tap-element", async () => {
      // Validate required fields
      validateRequired(data, ["elementType", "variableName"], NODE_NAME);

      // Get device ID and bundle ID from context
      const deviceId = getDeviceIdFromContext(context, NODE_NAME);
      const bundleId = getBundleIdFromContext(context, NODE_NAME);
      const accessibilityId = data.accessibilityId?.trim() || undefined;
      const labelMatch = data.labelMatch?.trim() || undefined;

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

      // Get signing config for physical devices
      const signingConfig = await getSigningConfigFromProject(projectId, deviceId);

      // Create or reuse WDA session (with signing config for physical devices)
      const sessionResult = await wda.createSession(deviceId, bundleId, signingConfig);
      if (!sessionResult.success) {
        throw createIOSError(
          IOS_ERROR_CODES.COMMAND_FAILED,
          `${NODE_NAME} failed: Could not create WDA session: ${sessionResult.error}`,
        );
      }

      let tapResult: { success: boolean; elementFound: boolean };
      let selectorDescription: string;

      // If accessibilityId is provided, use it; otherwise fall back to labelMatch
      if (accessibilityId) {
        // Find element by accessibility ID and tap it
        const elementResult = await wda.findElementByAccessibilityId(deviceId, accessibilityId);
        selectorDescription = `accessibilityId "${accessibilityId}"`;

        if (!elementResult.success || !elementResult.data) {
          throw createIOSError(
            IOS_ERROR_CODES.ELEMENT_NOT_FOUND,
            `${NODE_NAME} failed: Element with ${selectorDescription} not found`,
            { accessibilityId },
          );
        }

        // Get element rect for coordinate tap
        const rectResult = await wda.getElementRect(deviceId, elementResult.data);
        if (!rectResult.success || !rectResult.data) {
          throw createIOSError(
            IOS_ERROR_CODES.ELEMENT_NOT_INTERACTABLE,
            `${NODE_NAME} failed: Could not get element rect for ${selectorDescription}`,
            { accessibilityId },
          );
        }

        const { x, y, width, height } = rectResult.data;
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        tapResult = await wda.tapCoordinate(deviceId, centerX, centerY);
        tapResult.elementFound = true;
      } else {
        // Use WDA for tap with element type and label match
        tapResult = await wda.tap(deviceId, data.elementType!, 0, labelMatch);
        selectorDescription = labelMatch
          ? `${data.elementType} with label "${labelMatch}"`
          : data.elementType!;
      }

      if (!tapResult.success) {
        throw createIOSError(
          tapResult.elementFound
            ? IOS_ERROR_CODES.ELEMENT_NOT_INTERACTABLE
            : IOS_ERROR_CODES.ELEMENT_NOT_FOUND,
          `${NODE_NAME} failed: ${selectorDescription} ${tapResult.elementFound ? "found but tap failed" : "not found"}`,
          { elementType: data.elementType, accessibilityId, labelMatch },
        );
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          elementType: data.elementType,
          accessibilityId,
          labelMatch,
          elementFound: tapResult.elementFound,
        },
      };
    });

    await publish(
      iosTapChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    const errorInfo = formatErrorForDisplay(error);
    await publish(
      iosTapChannel().status({
        nodeId,
        status: "error",
        errorMessage: errorInfo.message,
        errorCode: errorInfo.code,
      }),
    );
    throw error;
  }
};
