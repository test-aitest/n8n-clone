import type { NodeExecutor } from "@/features/executions/types";
import { iosTapChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";
import {
  validateRequired,
  getDeviceIdFromContext,
  parseTimeout,
  createIOSError,
  IOS_ERROR_CODES,
  formatErrorForDisplay,
} from "@/features/ios-testing/lib/errors";

type TapData = {
  variableName?: string;
  accessibilityId?: string;
  timeout?: string;
};

const NODE_NAME = "Tap";

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
      // Validate required fields
      validateRequired(data, ["accessibilityId", "variableName"], NODE_NAME);

      // Get device ID from context
      const deviceId = getDeviceIdFromContext(context, NODE_NAME);

      const timeout = parseTimeout(data.timeout, 10000);
      const tapResult = await idb.tap(deviceId, data.accessibilityId!, timeout);

      if (!tapResult.success) {
        throw createIOSError(
          tapResult.elementFound
            ? IOS_ERROR_CODES.ELEMENT_NOT_INTERACTABLE
            : IOS_ERROR_CODES.ELEMENT_NOT_FOUND,
          `${NODE_NAME} failed: Element "${data.accessibilityId}" ${tapResult.elementFound ? "found but tap failed" : "not found"}`,
          { accessibilityId: data.accessibilityId, timeout }
        );
      }

      return {
        ...context,
        [data.variableName!]: {
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
    const errorInfo = formatErrorForDisplay(error);
    await publish(
      iosTapChannel().status({
        nodeId,
        status: "error",
        errorMessage: errorInfo.message,
        errorCode: errorInfo.code,
      })
    );
    throw error;
  }
};
