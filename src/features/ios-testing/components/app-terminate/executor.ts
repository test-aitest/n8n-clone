import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosAppTerminateChannel } from "@/inngest/channels/ios-testing";
import * as simulator from "@/lib/ios/simulator";

type AppTerminateData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
};

export const appTerminateExecutor: NodeExecutor<AppTerminateData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosAppTerminateChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("app-terminate", async () => {
      if (!data.deviceId) {
        throw new NonRetriableError("App Terminate: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("App Terminate: Variable name is required");
      }

      if (!data.bundleId) {
        throw new NonRetriableError("App Terminate: Bundle ID is required");
      }

      const terminateResult = await simulator.terminateApp(
        data.deviceId,
        data.bundleId,
      );

      if (!terminateResult.success) {
        throw new NonRetriableError(
          `App Terminate failed: ${terminateResult.error || "Unknown error"}`,
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          deviceId: data.deviceId,
          bundleId: data.bundleId,
        },
      };
    });

    await publish(
      iosAppTerminateChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosAppTerminateChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
