import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosExpectValueChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type ExpectValueData = {
  variableName?: string;
  accessibilityId?: string;
  expectedValue?: string;
  timeout?: string;
};

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
      if (!data.accessibilityId) {
        throw new NonRetriableError(
          "Expect Value: Accessibility ID is required",
        );
      }

      if (!data.expectedValue) {
        throw new NonRetriableError("Expect Value: Expected value is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Expect Value: Variable name is required");
      }

      // Get device ID from context (should be set by simulator boot node)
      const simulator = context.simulator as { deviceId?: string } | undefined;
      const deviceId =
        simulator?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Expect Value: No device ID found. Make sure simulator is booted first.",
        );
      }

      const timeout = data.timeout ? parseInt(data.timeout, 10) : 10000;

      // Wait for element to appear
      const element = await idb.waitForElement(
        deviceId,
        data.accessibilityId,
        timeout,
      );

      if (!element) {
        throw new NonRetriableError(
          `Expect Value failed: Element '${data.accessibilityId}' not found within ${timeout}ms`,
        );
      }

      // Get the value content (AXValue)
      const actualValue = element.AXValue || "";

      // Check if value matches (exact match)
      const matches = actualValue === data.expectedValue;

      if (!matches) {
        throw new NonRetriableError(
          `Expect Value failed: Expected "${data.expectedValue}" but got "${actualValue}"`,
        );
      }

      return {
        ...context,
        [data.variableName]: {
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
