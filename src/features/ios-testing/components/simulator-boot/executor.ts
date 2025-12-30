import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosSimulatorBootChannel } from "@/inngest/channels/ios-testing";
import * as simulator from "@/lib/ios/simulator";

type SimulatorBootData = {
  variableName?: string;
  deviceId?: string;
  timeout?: string;
};

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
      if (!data.deviceId) {
        throw new NonRetriableError("Simulator Boot: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Simulator Boot: Variable name is required");
      }

      const timeout = data.timeout ? parseInt(data.timeout, 10) : 60000;
      const bootResult = await simulator.bootSimulator(data.deviceId, timeout);

      if (!bootResult.success) {
        throw new NonRetriableError(
          `Simulator Boot failed: ${bootResult.error || "Unknown error"}`
        );
      }

      // Get simulator info after boot
      const sim = await simulator.getSimulator(data.deviceId);

      return {
        ...context,
        [data.variableName]: {
          success: true,
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
    await publish(
      iosSimulatorBootChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
