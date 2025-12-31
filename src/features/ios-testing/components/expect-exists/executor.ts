import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  formatErrorForDisplay,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  IOS_ERROR_CODES,
  parseTimeout,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import { iosExpectExistsChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type ExpectExistsData = {
  variableName?: string;
  elementType?: string;
  labelMatch?: string;
  timeout?: string;
};

const NODE_NAME = "Expect Exists";

export const expectExistsExecutor: NodeExecutor<ExpectExistsData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosExpectExistsChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("expect-exists", async () => {
      // Validate required fields
      validateRequired(data, ["elementType", "variableName"], NODE_NAME);

      // Get device ID and bundle ID from context
      const deviceId = getDeviceIdFromContext(context, NODE_NAME);
      const bundleId = getBundleIdFromContext(context, NODE_NAME);
      const timeout = parseTimeout(data.timeout, 10000);
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

      // Set implicit wait timeout
      const startTime = Date.now();
      let elementFound = false;

      // Poll for element existence within timeout
      while (Date.now() - startTime < timeout) {
        let elementResult;
        if (labelMatch) {
          elementResult = await wda.findElementByTypeAndLabel(
            deviceId,
            data.elementType!,
            labelMatch,
            0,
          );
        } else {
          elementResult = await wda.findElementByType(
            deviceId,
            data.elementType!,
            0,
          );
        }

        if (elementResult.success) {
          elementFound = true;
          break;
        }

        // Wait before next attempt
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      if (!elementFound) {
        const selector = labelMatch
          ? `${data.elementType} with label "${labelMatch}"`
          : data.elementType;
        throw createIOSError(
          IOS_ERROR_CODES.ELEMENT_NOT_FOUND,
          `${NODE_NAME} failed: ${selector} not found within ${timeout}ms`,
        );
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          exists: true,
          elementType: data.elementType,
          labelMatch,
        },
      };
    });

    await publish(
      iosExpectExistsChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    const errorInfo = formatErrorForDisplay(error);
    await publish(
      iosExpectExistsChannel().status({
        nodeId,
        status: "error",
        errorMessage: errorInfo.message,
        errorCode: errorInfo.code,
      }),
    );
    throw error;
  }
};
