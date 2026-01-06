import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosAppUninstallChannel } from "@/inngest/channels/ios-testing";
import * as simulator from "@/lib/ios/simulator";

type AppUninstallData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
};

export const appUninstallExecutor: NodeExecutor<AppUninstallData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosAppUninstallChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("app-uninstall", async () => {
      console.log("[App Uninstall] Starting with data:", JSON.stringify(data));

      if (!data.deviceId) {
        throw new NonRetriableError("App Uninstall: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("App Uninstall: Variable name is required");
      }

      if (!data.bundleId) {
        throw new NonRetriableError("App Uninstall: Bundle ID is required");
      }

      console.log("[App Uninstall] Uninstalling:", data.bundleId, "from device:", data.deviceId);

      const uninstallResult = await simulator.uninstallApp(
        data.deviceId,
        data.bundleId,
      );

      console.log("[App Uninstall] Result:", JSON.stringify(uninstallResult));

      if (!uninstallResult.success) {
        throw new NonRetriableError(
          `App Uninstall failed: ${uninstallResult.error || "Unknown error"}`,
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
      iosAppUninstallChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosAppUninstallChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
