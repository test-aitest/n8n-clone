import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosSwipeChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type SwipeData = {
  variableName?: string;
  direction?: "up" | "down" | "left" | "right";
  distance?: string;
};

export const swipeExecutor: NodeExecutor<SwipeData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosSwipeChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("swipe-gesture", async () => {
      if (!data.direction) {
        throw new NonRetriableError("Swipe: Direction is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Swipe: Variable name is required");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulatorContext = context.simulator as { deviceId?: string } | undefined;
      const deviceId = simulatorContext?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Swipe: No device ID found in context. Ensure Simulator Boot node runs first."
        );
      }

      const distance = data.distance ? parseInt(data.distance, 10) : 300;
      const swipeResult = await idb.swipeDirection(deviceId, data.direction, distance);

      if (!swipeResult.success) {
        throw new NonRetriableError(
          `Swipe failed: Could not perform swipe ${data.direction}`
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          direction: swipeResult.direction,
          distance,
        },
      };
    });

    await publish(
      iosSwipeChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosSwipeChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
