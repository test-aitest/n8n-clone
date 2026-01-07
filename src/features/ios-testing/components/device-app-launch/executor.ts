import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosDeviceAppLaunchChannel } from "@/inngest/channels/ios-testing";
import * as device from "@/lib/ios/device";
import * as wda from "@/lib/ios/wda";

type DeviceAppLaunchData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
  args?: string;
};

export const deviceAppLaunchExecutor: NodeExecutor<DeviceAppLaunchData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  console.log("[Device App Launch Executor] START - nodeId:", nodeId);
  console.log("[Device App Launch Executor] data:", JSON.stringify(data));
  console.log("[Device App Launch Executor] context keys:", Object.keys(context));

  await publish(
    iosDeviceAppLaunchChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("device-app-launch", async () => {
      if (!data.deviceId) {
        throw new NonRetriableError("Device App Launch: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Device App Launch: Variable name is required");
      }

      if (!data.bundleId) {
        throw new NonRetriableError("Device App Launch: Bundle ID is required");
      }

      // Verify this is a physical device
      const physicalDevice = await device.getPhysicalDevice(data.deviceId);
      if (!physicalDevice) {
        throw new NonRetriableError(
          "Device App Launch: Device not found or not connected. Make sure the device is connected via USB or paired via WiFi."
        );
      }

      // Parse args string into array
      const argsArray = data.args
        ? data.args.split(/\s+/).filter((arg) => arg.length > 0)
        : [];

      // Clear any existing WDA session to ensure clean state
      await wda.deleteSession(data.deviceId);

      // Terminate the app first to ensure clean state
      await device.terminateApp(data.deviceId, data.bundleId);

      // Wait a moment for app to fully terminate
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Launch using devicectl
      const launchResult = await device.launchApp(
        data.deviceId,
        data.bundleId,
        argsArray.length > 0 ? argsArray : undefined,
      );

      if (!launchResult.success) {
        throw new NonRetriableError(
          `Device App Launch failed: ${launchResult.error || "Unknown error"}`,
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
      iosDeviceAppLaunchChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosDeviceAppLaunchChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
