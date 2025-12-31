import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  IOS_ERROR_CODES,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import { iosScrollUntilVisibleChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type ScrollUntilVisibleData = {
  variableName?: string;
  accessibilityId?: string;
  direction?: "up" | "down";
  maxScrolls?: string;
};

const NODE_NAME = "Scroll Until Visible";

export const scrollUntilVisibleExecutor: NodeExecutor<
  ScrollUntilVisibleData
> = async ({ data, nodeId, context, step, publish }) => {
  await publish(
    iosScrollUntilVisibleChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("scroll-until-visible", async () => {
      // Validate required fields
      validateRequired(data, ["accessibilityId", "variableName"], NODE_NAME);

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

      const direction = data.direction || "down";
      const maxScrolls = data.maxScrolls ? parseInt(data.maxScrolls, 10) : 10;

      const scrollResult = await wda.scrollUntilVisible(
        deviceId,
        data.accessibilityId!,
        direction,
        maxScrolls,
      );

      if (!scrollResult.found) {
        throw createIOSError(
          IOS_ERROR_CODES.ELEMENT_NOT_FOUND,
          `${NODE_NAME} failed: Element ${data.accessibilityId} not found after ${maxScrolls} scrolls`,
        );
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          found: scrollResult.found,
          scrollCount: scrollResult.scrollCount,
          accessibilityId: data.accessibilityId,
        },
      };
    });

    await publish(
      iosScrollUntilVisibleChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosScrollUntilVisibleChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
