import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  IOS_ERROR_CODES,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import { iosToggleSwitchChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type ToggleSwitchData = {
  variableName?: string;
  targetState?: "toggle" | "on" | "off";
};

const NODE_NAME = "Toggle Switch";

export const toggleSwitchExecutor: NodeExecutor<ToggleSwitchData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosToggleSwitchChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("toggle-switch", async () => {
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

      // Convert targetState to boolean or undefined for toggleSwitch function
      let targetStateBoolean: boolean | undefined;
      if (data.targetState === "on") {
        targetStateBoolean = true;
      } else if (data.targetState === "off") {
        targetStateBoolean = false;
      }
      // If "toggle" or undefined, pass undefined to toggle the current state

      const toggleResult = await wda.toggleSwitch(
        deviceId,
        0, // elementIndex defaults to 0
        targetStateBoolean,
      );

      if (!toggleResult.success) {
        throw createIOSError(
          IOS_ERROR_CODES.COMMAND_FAILED,
          `${NODE_NAME} failed: Could not toggle switch. ${toggleResult.error || ""}`,
        );
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          newState: toggleResult.data?.newState,
          targetState: data.targetState,
        },
      };
    });

    await publish(
      iosToggleSwitchChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosToggleSwitchChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
