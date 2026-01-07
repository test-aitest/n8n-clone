import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosDeviceAppTerminateChannel } from "@/inngest/channels/ios-testing";
import * as device from "@/lib/ios/device";
import * as wda from "@/lib/ios/wda";

type DeviceAppTerminateData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
};

export const deviceAppTerminateExecutor: NodeExecutor<DeviceAppTerminateData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosDeviceAppTerminateChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("device-app-terminate", async () => {
      if (!data.deviceId) {
        throw new NonRetriableError("Device App Terminate: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Device App Terminate: Variable name is required");
      }

      if (!data.bundleId) {
        throw new NonRetriableError("Device App Terminate: Bundle ID is required");
      }

      // Verify this is a physical device
      const physicalDevice = await device.getPhysicalDevice(data.deviceId);
      if (!physicalDevice) {
        throw new NonRetriableError(
          "Device App Terminate: Device not found or not connected. Make sure the device is connected via USB or paired via WiFi."
        );
      }

      // Try to terminate via WDA session if exists
      try {
        await wda.terminateApp(data.deviceId, data.bundleId);
      } catch {
        // Ignore WDA errors, try devicectl as fallback
      }

      // Terminate using devicectl
      const terminateResult = await device.terminateApp(
        data.deviceId,
        data.bundleId,
      );

      if (!terminateResult.success) {
        throw new NonRetriableError(
          `Device App Terminate failed: ${terminateResult.error || "Unknown error"}`,
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
      iosDeviceAppTerminateChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosDeviceAppTerminateChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
