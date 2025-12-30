import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosToggleSwitchChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type ToggleSwitchData = {
  variableName?: string;
  accessibilityId?: string;
  targetState?: "toggle" | "on" | "off";
};

export const toggleSwitchExecutor: NodeExecutor<ToggleSwitchData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosToggleSwitchChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("toggle-switch", async () => {
      if (!data.accessibilityId) {
        throw new NonRetriableError(
          "Toggle Switch: Accessibility ID is required",
        );
      }

      if (!data.variableName) {
        throw new NonRetriableError("Toggle Switch: Variable name is required");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulatorContext = context.simulator as
        | { deviceId?: string }
        | undefined;
      const deviceId =
        simulatorContext?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Toggle Switch: No device ID found in context. Ensure Simulator Boot node runs first.",
        );
      }

      // Convert targetState to boolean or undefined for toggleSwitch function
      let targetStateBoolean: boolean | undefined;
      if (data.targetState === "on") {
        targetStateBoolean = true;
      } else if (data.targetState === "off") {
        targetStateBoolean = false;
      }
      // If "toggle" or undefined, pass undefined to toggle the current state

      const toggleResult = await idb.toggleSwitch(
        deviceId,
        data.accessibilityId,
        targetStateBoolean,
      );

      if (!toggleResult.success) {
        throw new NonRetriableError(
          `Toggle Switch failed: Could not toggle switch ${data.accessibilityId}. ${toggleResult.error || ""}`,
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          accessibilityId: data.accessibilityId,
          newState: toggleResult.data?.newState,
          targetState: data.targetState,
        },
      };
    });

    await publish(
      iosToggleSwitchChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosToggleSwitchChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
