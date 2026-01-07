import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  getSigningConfigFromProject,
  IOS_ERROR_CODES,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import { iosSliderSetChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type SliderSetData = {
  variableName?: string;
  value?: number;
};

const NODE_NAME = "Slider Set";

export const sliderSetExecutor: NodeExecutor<SliderSetData> = async ({
  data,
  nodeId,
  projectId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosSliderSetChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("slider-set", async () => {
      // Validate required fields
      validateRequired(data, ["variableName"], NODE_NAME);

      if (data.value === undefined || data.value === null) {
        throw createIOSError(
          IOS_ERROR_CODES.MISSING_REQUIRED_FIELD,
          `${NODE_NAME}: Value is required`,
        );
      }

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

      // Get signing config for physical devices
      const signingConfig = await getSigningConfigFromProject(projectId, deviceId);

      // Create or reuse WDA session
      const sessionResult = await wda.createSession(deviceId, bundleId, signingConfig);
      if (!sessionResult.success) {
        throw createIOSError(
          IOS_ERROR_CODES.COMMAND_FAILED,
          `${NODE_NAME} failed: Could not create WDA session: ${sessionResult.error}`,
        );
      }

      const sliderResult = await wda.setSliderValue(
        deviceId,
        data.value,
        0, // elementIndex defaults to 0
      );

      if (!sliderResult.success) {
        throw createIOSError(
          IOS_ERROR_CODES.COMMAND_FAILED,
          `${NODE_NAME} failed: Could not set slider to ${data.value}. ${sliderResult.error || ""}`,
        );
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          value: data.value,
        },
      };
    });

    await publish(
      iosSliderSetChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosSliderSetChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
