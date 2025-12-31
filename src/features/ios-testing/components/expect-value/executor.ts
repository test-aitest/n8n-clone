import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import {
  createIOSError,
  getBundleIdFromContext,
  getDeviceIdFromContext,
  IOS_ERROR_CODES,
  parseTimeout,
  validateRequired,
} from "@/features/ios-testing/lib/errors";
import { iosExpectValueChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type ExpectValueData = {
  variableName?: string;
  accessibilityId?: string;
  expectedValue?: string;
  timeout?: string;
};

const NODE_NAME = "Expect Value";

export const expectValueExecutor: NodeExecutor<ExpectValueData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosExpectValueChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("expect-value", async () => {
      // Validate required fields
      validateRequired(
        data,
        ["accessibilityId", "expectedValue", "variableName"],
        NODE_NAME,
      );

      // Get device ID and bundle ID from context
      const deviceId = getDeviceIdFromContext(context, NODE_NAME);
      const bundleId = getBundleIdFromContext(context, NODE_NAME);
      const timeout = parseTimeout(data.timeout, 10000);

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

      // Wait for element to appear
      const elementResult = await wda.waitForElement(
        deviceId,
        data.accessibilityId!,
        timeout,
      );

      if (!elementResult.success) {
        throw createIOSError(
          IOS_ERROR_CODES.ELEMENT_NOT_FOUND,
          `${NODE_NAME} failed: Element '${data.accessibilityId}' not found within ${timeout}ms`,
        );
      }

      // Get the value content
      const actualValue =
        (await wda.getElementValue(deviceId, data.accessibilityId!)) || "";

      // Check if value matches (exact match)
      const matches = actualValue === data.expectedValue;

      if (!matches) {
        throw new NonRetriableError(
          `${NODE_NAME} failed: Expected "${data.expectedValue}" but got "${actualValue}"`,
        );
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          matches: true,
          accessibilityId: data.accessibilityId,
          expectedValue: data.expectedValue,
          actualValue,
        },
      };
    });

    await publish(
      iosExpectValueChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosExpectValueChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
