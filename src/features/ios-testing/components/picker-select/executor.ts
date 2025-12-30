import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosPickerSelectChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type PickerSelectData = {
  variableName?: string;
  accessibilityId?: string;
  value?: string;
};

export const pickerSelectExecutor: NodeExecutor<PickerSelectData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosPickerSelectChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("picker-select", async () => {
      if (!data.accessibilityId) {
        throw new NonRetriableError("Picker Select: Accessibility ID is required");
      }

      if (!data.value) {
        throw new NonRetriableError("Picker Select: Value is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Picker Select: Variable name is required");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulator = context.simulator as { deviceId?: string } | undefined;
      const deviceId = simulator?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Picker Select: No device ID found in context. Ensure Simulator Boot node runs first."
        );
      }

      const pickerResult = await idb.selectPickerValue(
        deviceId,
        data.accessibilityId,
        data.value
      );

      if (!pickerResult.success) {
        throw new NonRetriableError(
          `Picker Select failed: Could not select value "${data.value}" in picker ${data.accessibilityId}. ${pickerResult.error || ""}`
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          accessibilityId: data.accessibilityId,
          selectedValue: data.value,
        },
      };
    });

    await publish(
      iosPickerSelectChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosPickerSelectChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
