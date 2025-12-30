import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosTapChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type TapData = {
  variableName?: string;
  accessibilityId?: string;
  timeout?: string;
};

export const tapExecutor: NodeExecutor<TapData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosTapChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("tap-element", async () => {
      if (!data.accessibilityId) {
        throw new NonRetriableError("Tap: Accessibility ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Tap: Variable name is required");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulatorContext = context.simulator as { deviceId?: string } | undefined;
      const deviceId = simulatorContext?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Tap: No device ID found in context. Ensure Simulator Boot node runs first."
        );
      }

      const timeout = data.timeout ? parseInt(data.timeout, 10) : 10000;
      const tapResult = await idb.tap(deviceId, data.accessibilityId, timeout);

      if (!tapResult.success) {
        throw new NonRetriableError(
          `Tap failed: Element not found or tap failed for ${data.accessibilityId}`
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          accessibilityId: data.accessibilityId,
          elementFound: tapResult.elementFound,
        },
      };
    });

    await publish(
      iosTapChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosTapChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
