import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosExpectTextChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type ExpectTextData = {
  variableName?: string;
  accessibilityId?: string;
  expectedText?: string;
  matchType?: "exact" | "contains" | "regex";
  timeout?: string;
};

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
      if (!data.accessibilityId) {
        throw new NonRetriableError(
          "Expect Text: Accessibility ID is required",
        );
      }

      if (!data.expectedText) {
        throw new NonRetriableError("Expect Text: Expected text is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Expect Text: Variable name is required");
      }

      // Get device ID from context (should be set by simulator boot node)
      const simulator = context.simulator as { deviceId?: string } | undefined;
      const deviceId =
        simulator?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Expect Text: No device ID found. Make sure simulator is booted first.",
        );
      }

      const timeout = data.timeout ? parseInt(data.timeout, 10) : 10000;
      const matchType = data.matchType || "exact";

      // Wait for element to appear
      const element = await idb.waitForElement(
        deviceId,
        data.accessibilityId,
        timeout,
      );

      if (!element) {
        throw new NonRetriableError(
          `Expect Text failed: Element '${data.accessibilityId}' not found within ${timeout}ms`,
        );
      }

      // Get the text content (AXLabel)
      const actualText = element.AXLabel || "";

      // Check if text matches based on match type
      let matches = false;
      switch (matchType) {
        case "exact":
          matches = actualText === data.expectedText;
          break;
        case "contains":
          matches = actualText.includes(data.expectedText);
          break;
        case "regex":
          try {
            const regex = new RegExp(data.expectedText);
            matches = regex.test(actualText);
          } catch {
            throw new NonRetriableError(
              `Expect Text: Invalid regular expression: ${data.expectedText}`,
            );
          }
          break;
      }

      if (!matches) {
        throw new NonRetriableError(
          `Expect Text failed: Expected "${data.expectedText}" (${matchType}) but got "${actualText}"`,
        );
      }

      return {
        ...context,
        [data.variableName]: {
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
