import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  IOS_ERROR_CODES,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import { iosPickerSelectChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type PickerSelectData = {
  variableName?: string;
  accessibilityId?: string;
  value?: string;
};

const NODE_NAME = "Picker Select";

export const pickerSelectExecutor: NodeExecutor<PickerSelectData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosPickerSelectChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("picker-select", async () => {
      // Validate required fields
      validateRequired(
        data,
        ["accessibilityId", "value", "variableName"],
        NODE_NAME,
      );

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

      const pickerResult = await wda.selectPickerValue(
        deviceId,
        data.accessibilityId!,
        data.value!,
      );

      if (!pickerResult.success) {
        throw createIOSError(
          IOS_ERROR_CODES.COMMAND_FAILED,
          `${NODE_NAME} failed: Could not select value "${data.value}" in picker ${data.accessibilityId}. ${pickerResult.error || ""}`,
        );
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          accessibilityId: data.accessibilityId,
          selectedValue: data.value,
        },
      };
    });

    await publish(
      iosPickerSelectChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosPickerSelectChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
