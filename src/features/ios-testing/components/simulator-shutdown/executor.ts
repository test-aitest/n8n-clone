import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosSimulatorShutdownChannel } from "@/inngest/channels/ios-testing";
import * as simulator from "@/lib/ios/simulator";

type SimulatorShutdownData = {
  variableName?: string;
  deviceId?: string;
};

export const simulatorShutdownExecutor: NodeExecutor<SimulatorShutdownData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosSimulatorShutdownChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("simulator-shutdown", async () => {
      if (!data.deviceId) {
        throw new NonRetriableError("Simulator Shutdown: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Simulator Shutdown: Variable name is required");
      }

      const shutdownResult = await simulator.shutdownSimulator(data.deviceId);

      if (!shutdownResult.success) {
        throw new NonRetriableError(
          `Simulator Shutdown failed: ${shutdownResult.error || "Unknown error"}`
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          deviceId: data.deviceId,
          state: "Shutdown",
        },
      };
    });

    await publish(
      iosSimulatorShutdownChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosSimulatorShutdownChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
