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
import { iosExpectTextChannel } from "@/inngest/channels/ios-testing";
import * as wda from "@/lib/ios/wda";

type ExpectTextData = {
  variableName?: string;
  accessibilityId?: string;
  expectedText?: string;
  matchType?: "exact" | "contains" | "regex";
  timeout?: string;
};

const NODE_NAME = "Expect Text";

export const expectTextExecutor: NodeExecutor<ExpectTextData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosExpectTextChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("expect-text", async () => {
      // Validate required fields
      validateRequired(
        data,
        ["accessibilityId", "expectedText", "variableName"],
        NODE_NAME,
      );

      // Get device ID and bundle ID from context
      const deviceId = getDeviceIdFromContext(context, NODE_NAME);
      const bundleId = getBundleIdFromContext(context, NODE_NAME);
      const timeout = parseTimeout(data.timeout, 10000);
      const matchType = data.matchType || "exact";

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

      // Get the text content
      const actualText =
        (await wda.getElementText(deviceId, data.accessibilityId!)) || "";

      // Check if text matches based on match type
      let matches = false;
      switch (matchType) {
        case "exact":
          matches = actualText === data.expectedText;
          break;
        case "contains":
          matches = actualText.includes(data.expectedText!);
          break;
        case "regex":
          try {
            const regex = new RegExp(data.expectedText!);
            matches = regex.test(actualText);
          } catch {
            throw new NonRetriableError(
              `${NODE_NAME}: Invalid regular expression: ${data.expectedText}`,
            );
          }
          break;
      }

      if (!matches) {
        throw new NonRetriableError(
          `${NODE_NAME} failed: Expected "${data.expectedText}" (${matchType}) but got "${actualText}"`,
        );
      }

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          matches: true,
          accessibilityId: data.accessibilityId,
          expectedText: data.expectedText,
          actualText,
          matchType,
        },
      };
    });

    await publish(
      iosExpectTextChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosExpectTextChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
