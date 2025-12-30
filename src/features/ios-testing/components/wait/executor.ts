import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosWaitChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";
import { sleep } from "@/lib/ios/utils";

type WaitData = {
  variableName?: string;
  waitType?: "duration" | "element";
  duration?: string;
  accessibilityId?: string;
  timeout?: string;
};

export const waitExecutor: NodeExecutor<WaitData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosWaitChannel().status({
      nodeId,
      status: "loading",
    })
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
          throw new NonRetriableError("Wait: Duration is required for duration wait");
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
        throw new NonRetriableError("Wait: Accessibility ID is required for element wait");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulatorContext = context.simulator as { deviceId?: string } | undefined;
      const deviceId = simulatorContext?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Wait: No device ID found in context. Ensure Simulator Boot node runs first."
        );
      }

      const timeout = data.timeout ? parseInt(data.timeout, 10) : 10000;
      const element = await idb.waitForElement(deviceId, data.accessibilityId, timeout);

      if (!element) {
        throw new NonRetriableError(
          `Wait failed: Element ${data.accessibilityId} did not appear within ${timeout}ms`
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
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosWaitChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
