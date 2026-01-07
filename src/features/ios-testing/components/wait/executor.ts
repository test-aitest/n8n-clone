import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  getSigningConfigFromProject,
  IOS_ERROR_CODES,
} from "@/features/ios-testing/lib/errors";
import { iosWaitChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";
import { sleep } from "@/lib/ios/utils";

type WaitData = {
  variableName?: string;
  waitType?: "duration" | "element";
  duration?: string;
  accessibilityId?: string;
  timeout?: string;
};

const NODE_NAME = "Wait";

export const waitExecutor: NodeExecutor<WaitData> = async ({
  data,
  nodeId,
  projectId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosWaitChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("wait", async () => {
      if (!data.variableName) {
        throw new NonRetriableError("Wait: Variable name is required");
      }

      if (!data.waitType) {
        throw new NonRetriableError("Wait: Wait type is required");
      }

      if (data.waitType === "duration") {
        // Wait for a fixed duration
        if (!data.duration) {
          throw new NonRetriableError(
            "Wait: Duration is required for duration wait",
          );
        }

        const duration = parseInt(data.duration, 10);
        await sleep(duration);

        return {
          ...context,
          [data.variableName]: {
            success: true,
            waitType: "duration",
            duration,
          },
        };
      }

      // Wait for element
      if (!data.accessibilityId) {
        throw new NonRetriableError(
          "Wait: Accessibility ID is required for element wait",
        );
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

      const timeout = data.timeout ? parseInt(data.timeout, 10) : 10000;
      const elementResult = await wda.waitForElement(
        deviceId,
        data.accessibilityId,
        timeout,
      );

      if (!elementResult.success) {
        throw new NonRetriableError(
          `Wait failed: Element ${data.accessibilityId} did not appear within ${timeout}ms`,
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          waitType: "element",
          accessibilityId: data.accessibilityId,
          elementFound: true,
        },
      };
    });

    await publish(
      iosWaitChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosWaitChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
