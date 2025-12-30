import type { NodeExecutor } from "@/features/executions/types";
import { iosSimulatorBootChannel } from "@/inngest/channels/ios-testing";
import * as simulator from "@/lib/ios/simulator";
import {
  validateRequired,
  parseTimeout,
  createIOSError,
  IOS_ERROR_CODES,
  formatErrorForDisplay,
} from "@/features/ios-testing/lib/errors";

type SimulatorBootData = {
  variableName?: string;
  deviceId?: string;
  timeout?: string;
};

const NODE_NAME = "Simulator Boot";

export const simulatorBootExecutor: NodeExecutor<SimulatorBootData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosSimulatorBootChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("simulator-boot", async () => {
      // Validate required fields
      validateRequired(data, ["deviceId", "variableName"], NODE_NAME);

      const timeout = parseTimeout(data.timeout, 60000);
      const bootResult = await simulator.bootSimulator(data.deviceId!, timeout);

      if (!bootResult.success) {
        throw createIOSError(
          IOS_ERROR_CODES.DEVICE_BOOT_TIMEOUT,
          `${NODE_NAME} failed: ${bootResult.error || "Unknown error"}`,
          { deviceId: data.deviceId }
        );
      }

      // Get simulator info after boot
      const sim = await simulator.getSimulator(data.deviceId!);

      return {
        ...context,
        [data.variableName!]: {
          success: true,
          deviceId: data.deviceId,
          state: sim?.state || "Booted",
          name: sim?.name,
          runtime: sim?.runtime,
        },
        // Also store simulator info at top level for easy access by other nodes
        simulator: {
          deviceId: data.deviceId,
          state: sim?.state || "Booted",
          name: sim?.name,
          runtime: sim?.runtime,
        },
      };
    });

    await publish(
      iosSimulatorBootChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    const errorInfo = formatErrorForDisplay(error);
    await publish(
      iosSimulatorBootChannel().status({
        nodeId,
        status: "error",
        errorMessage: errorInfo.message,
        errorCode: errorInfo.code,
      })
    );
    throw error;
  }
};
