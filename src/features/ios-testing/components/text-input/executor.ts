import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosTextInputChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type TextInputData = {
  variableName?: string;
  accessibilityId?: string;
  text?: string;
  clearFirst?: boolean;
};

export const textInputExecutor: NodeExecutor<TextInputData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosTextInputChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("text-input", async () => {
      if (!data.text) {
        throw new NonRetriableError("Text Input: Text is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Text Input: Variable name is required");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulatorContext = context.simulator as
        | { deviceId?: string }
        | undefined;
      const deviceId =
        simulatorContext?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Text Input: No device ID found in context. Ensure Simulator Boot node runs first.",
        );
      }

      let inputResult: { success: boolean; textEntered: string };

      if (data.accessibilityId) {
        // Type into a specific field
        inputResult = await idb.typeTextInField(
          deviceId,
          data.accessibilityId,
          data.text,
          data.clearFirst ?? true,
        );
      } else {
        // Type into the currently focused field
        inputResult = await idb.typeText(deviceId, data.text);
      }

      if (!inputResult.success) {
        throw new NonRetriableError(
          `Text Input failed: Could not type text${data.accessibilityId ? ` into ${data.accessibilityId}` : ""}`,
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          text: data.text,
          accessibilityId: data.accessibilityId,
          textEntered: inputResult.textEntered,
        },
      };
    });

    await publish(
      iosTextInputChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosTextInputChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
