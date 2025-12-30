import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosScrollUntilVisibleChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type ScrollUntilVisibleData = {
  variableName?: string;
  accessibilityId?: string;
  direction?: "up" | "down";
  maxScrolls?: string;
};

export const scrollUntilVisibleExecutor: NodeExecutor<ScrollUntilVisibleData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosScrollUntilVisibleChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("scroll-until-visible", async () => {
      if (!data.accessibilityId) {
        throw new NonRetriableError("Scroll Until Visible: Accessibility ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Scroll Until Visible: Variable name is required");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulatorContext = context.simulator as { deviceId?: string } | undefined;
      const deviceId = simulatorContext?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Scroll Until Visible: No device ID found in context. Ensure Simulator Boot node runs first."
        );
      }

      const direction = data.direction || "down";
      const maxScrolls = data.maxScrolls ? parseInt(data.maxScrolls, 10) : 10;

      const scrollResult = await idb.scrollUntilVisible(
        deviceId,
        data.accessibilityId,
        direction,
        maxScrolls
      );

      if (!scrollResult.found) {
        throw new NonRetriableError(
          `Scroll Until Visible failed: Element ${data.accessibilityId} not found after ${maxScrolls} scrolls`
        );
      }

      return {
        ...context,
        [data.variableName]: {
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
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosScrollUntilVisibleChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
