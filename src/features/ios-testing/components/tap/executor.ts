import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  formatErrorForDisplay,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  IOS_ERROR_CODES,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import { iosTapChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type TapData = {
  variableName?: string;
  elementType?: string;
  labelMatch?: string;
};

const NODE_NAME = "Tap";

export const tapExecutor: NodeExecutor<TapData> = async ({
  data,
  nodeId,
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

      // Create or reuse WDA session
      const sessionResult = await wda.createSession(deviceId, bundleId);
      if (!sessionResult.success) {
        throw createIOSError(
          IOS_ERROR_CODES.COMMAND_FAILED,
          `${NODE_NAME} failed: Could not create WDA session: ${sessionResult.error}`,
        );
      }

      // Use WDA for tap with element type and label match
      const tapResult = await wda.tap(deviceId, data.elementType!, 0, labelMatch);

      if (!tapResult.success) {
        const selector = labelMatch
          ? `${data.elementType} with label "${labelMatch}"`
          : data.elementType;
        throw createIOSError(
          tapResult.elementFound
            ? IOS_ERROR_CODES.ELEMENT_NOT_INTERACTABLE
            : IOS_ERROR_CODES.ELEMENT_NOT_FOUND,
          `${NODE_NAME} failed: ${selector} ${tapResult.elementFound ? "found but tap failed" : "not found"}`,
          { elementType: data.elementType, labelMatch },
        );
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          elementType: data.elementType,
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
