import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosExpectExistsChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type ExpectExistsData = {
  variableName?: string;
  accessibilityId?: string;
  timeout?: string;
};

export const expectExistsExecutor: NodeExecutor<ExpectExistsData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosExpectExistsChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("expect-exists", async () => {
      if (!data.accessibilityId) {
        throw new NonRetriableError("Expect Exists: Accessibility ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Expect Exists: Variable name is required");
      }

      // Get device ID from context (should be set by simulator boot node)
      const simulator = context.simulator as { deviceId?: string } | undefined;
      const deviceId = simulator?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Expect Exists: No device ID found. Make sure simulator is booted first."
        );
      }

      const timeout = data.timeout ? parseInt(data.timeout, 10) : 10000;

      // Wait for element to appear
      const element = await idb.waitForElement(
        deviceId,
        data.accessibilityId,
        timeout
      );

      const exists = element !== undefined;

      if (!exists) {
        throw new NonRetriableError(
          `Expect Exists failed: Element '${data.accessibilityId}' not found within ${timeout}ms`
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          exists: true,
          accessibilityId: data.accessibilityId,
          element: element
            ? {
                role: element.AXRole,
                label: element.AXLabel,
                value: element.AXValue,
                frame: element.AXFrame,
              }
            : null,
        },
      };
    });

    await publish(
      iosExpectExistsChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosExpectExistsChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
