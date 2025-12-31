import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  IOS_ERROR_CODES,
} from "@/features/ios-testing/lib/errors";
import { iosTextInputChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type TextInputData = {
  variableName?: string;
  elementType?: string;
  labelMatch?: string;
  text?: string;
  clearFirst?: boolean;
};

const NODE_NAME = "Text Input";

export const textInputExecutor: NodeExecutor<TextInputData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosTextInputChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("text-input", async () => {
      if (!data.text) {
        throw new NonRetriableError("Text Input: Text is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Text Input: Variable name is required");
      }

      // Get the device ID and bundle ID from context
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

      const labelMatch = data.labelMatch?.trim() || undefined;

      if (!data.elementType) {
        throw new NonRetriableError("Text Input: Element type is required");
      }

      // Use WDA for text input - tap element by type first, then type
      const inputResult = await wda.typeText(
        deviceId,
        data.elementType,
        data.text,
        0,
        data.clearFirst ?? true,
        labelMatch,
      );

      if (!inputResult.success) {
        const selector = labelMatch
          ? `${data.elementType} with label "${labelMatch}"`
          : data.elementType;
        throw new NonRetriableError(
          `Text Input failed: Could not type text into ${selector}`,
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          text: data.text,
          elementType: data.elementType,
          labelMatch,
          textEntered: inputResult.textEntered,
        },
      };
    });

    await publish(
      iosTextInputChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosTextInputChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
