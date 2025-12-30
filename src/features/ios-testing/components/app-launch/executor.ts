import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosAppLaunchChannel } from "@/inngest/channels/ios-testing";
import * as simulator from "@/lib/ios/simulator";

type AppLaunchData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
  args?: string;
};

export const appLaunchExecutor: NodeExecutor<AppLaunchData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosAppLaunchChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("app-launch", async () => {
      if (!data.deviceId) {
        throw new NonRetriableError("App Launch: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("App Launch: Variable name is required");
      }

      if (!data.bundleId) {
        throw new NonRetriableError("App Launch: Bundle ID is required");
      }

      // Parse args string into array
      const argsArray = data.args
        ? data.args.split(/\s+/).filter((arg) => arg.length > 0)
        : [];

      const launchResult = await simulator.launchApp(
        data.deviceId,
        data.bundleId,
        argsArray
      );

      if (!launchResult.success) {
        throw new NonRetriableError(
          `App Launch failed: ${launchResult.error || "Unknown error"}`
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          deviceId: data.deviceId,
          bundleId: data.bundleId,
          pid: launchResult.data?.pid,
        },
      };
    });

    await publish(
      iosAppLaunchChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosAppLaunchChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
