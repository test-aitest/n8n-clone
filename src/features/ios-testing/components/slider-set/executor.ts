import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosSliderSetChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type SliderSetData = {
  variableName?: string;
  accessibilityId?: string;
  value?: number;
};

export const sliderSetExecutor: NodeExecutor<SliderSetData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosSliderSetChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("slider-set", async () => {
      if (!data.accessibilityId) {
        throw new NonRetriableError("Slider Set: Accessibility ID is required");
      }

      if (data.value === undefined || data.value === null) {
        throw new NonRetriableError("Slider Set: Value is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Slider Set: Variable name is required");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulatorContext = context.simulator as
        | { deviceId?: string }
        | undefined;
      const deviceId =
        simulatorContext?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Slider Set: No device ID found in context. Ensure Simulator Boot node runs first.",
        );
      }

      const sliderResult = await idb.setSliderValue(
        deviceId,
        data.accessibilityId,
        data.value,
      );

      if (!sliderResult.success) {
        throw new NonRetriableError(
          `Slider Set failed: Could not set slider ${data.accessibilityId} to ${data.value}. ${sliderResult.error || ""}`,
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          accessibilityId: data.accessibilityId,
          value: data.value,
        },
      };
    });

    await publish(
      iosSliderSetChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosSliderSetChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
