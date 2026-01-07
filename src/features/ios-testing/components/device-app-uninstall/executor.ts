import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosDeviceAppUninstallChannel } from "@/inngest/channels/ios-testing";
import * as device from "@/lib/ios/device";

type DeviceAppUninstallData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
};

export const deviceAppUninstallExecutor: NodeExecutor<DeviceAppUninstallData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosDeviceAppUninstallChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("device-app-uninstall", async () => {
      console.log("[Device App Uninstall] Starting with data:", JSON.stringify(data));

      if (!data.deviceId) {
        throw new NonRetriableError("Device App Uninstall: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Device App Uninstall: Variable name is required");
      }

      if (!data.bundleId) {
        throw new NonRetriableError("Device App Uninstall: Bundle ID is required");
      }

      // Verify this is a physical device
      const physicalDevice = await device.getPhysicalDevice(data.deviceId);
      if (!physicalDevice) {
        throw new NonRetriableError(
          "Device App Uninstall: Device not found or not connected. Make sure the device is connected via USB or paired via WiFi."
        );
      }

      console.log("[Device App Uninstall] Uninstalling:", data.bundleId, "from device:", data.deviceId);

      const uninstallResult = await device.uninstallApp(
        data.deviceId,
        data.bundleId,
      );

      console.log("[Device App Uninstall] Result:", JSON.stringify(uninstallResult));

      if (!uninstallResult.success) {
        throw new NonRetriableError(
          `Device App Uninstall failed: ${uninstallResult.error || "Unknown error"}`,
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
      iosDeviceAppUninstallChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosDeviceAppUninstallChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
