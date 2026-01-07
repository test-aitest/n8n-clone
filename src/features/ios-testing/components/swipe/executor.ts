import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  getSigningConfigFromProject,
  IOS_ERROR_CODES,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import { iosSwipeChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type SwipeData = {
  variableName?: string;
  direction?: "up" | "down" | "left" | "right";
  distance?: string;
};

const NODE_NAME = "Swipe";

export const swipeExecutor: NodeExecutor<SwipeData> = async ({
  data,
  nodeId,
  projectId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosSwipeChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("swipe-gesture", async () => {
      // Validate required fields
      validateRequired(data, ["direction", "variableName"], NODE_NAME);

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

      const distance = data.distance ? parseInt(data.distance, 10) : 300;

      // Calculate swipe coordinates based on direction
      // Use screen center as starting point, swipe by distance
      const centerX = 195; // iPhone screen center approximation
      const centerY = 422;

      let startX = centerX;
      let startY = centerY;
      let endX = centerX;
      let endY = centerY;

      switch (data.direction) {
        case "up":
          startY = centerY + distance / 2;
          endY = centerY - distance / 2;
          break;
        case "down":
          startY = centerY - distance / 2;
          endY = centerY + distance / 2;
          break;
        case "left":
          startX = centerX + distance / 2;
          endX = centerX - distance / 2;
          break;
        case "right":
          startX = centerX - distance / 2;
          endX = centerX + distance / 2;
          break;
      }

      const swipeResult = await wda.swipe(
        deviceId,
        startX,
        startY,
        endX,
        endY,
        500,
      );

      if (!swipeResult.success) {
        throw createIOSError(
          IOS_ERROR_CODES.COMMAND_FAILED,
          `${NODE_NAME} failed: Could not perform swipe ${data.direction}`,
        );
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          direction: data.direction,
          distance,
        },
      };
    });

    await publish(
      iosSwipeChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosSwipeChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
