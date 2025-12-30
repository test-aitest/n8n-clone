import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosAppInstallChannel } from "@/inngest/channels/ios-testing";
import * as simulator from "@/lib/ios/simulator";

type AppInstallData = {
  variableName?: string;
  deviceId?: string;
  appPath?: string;
};

export const appInstallExecutor: NodeExecutor<AppInstallData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosAppInstallChannel().status({
      nodeId,
      status: "loading",
    })
  );

  try {
    const result = await step.run("app-install", async () => {
      if (!data.deviceId) {
        throw new NonRetriableError("App Install: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("App Install: Variable name is required");
      }

      if (!data.appPath) {
        throw new NonRetriableError("App Install: App path is required");
      }

      const installResult = await simulator.installApp(data.deviceId, data.appPath);

      if (!installResult.success) {
        throw new NonRetriableError(
          `App Install failed: ${installResult.error || "Unknown error"}`
        );
      }

      return {
        ...context,
        [data.variableName]: {
          success: true,
          deviceId: data.deviceId,
          appPath: data.appPath,
        },
      };
    });

    await publish(
      iosAppInstallChannel().status({
        nodeId,
        status: "success",
      })
    );

    return result;
  } catch (error) {
    await publish(
      iosAppInstallChannel().status({
        nodeId,
        status: "error",
      })
    );
    throw error;
  }
};
