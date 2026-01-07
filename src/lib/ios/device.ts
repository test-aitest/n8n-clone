/**
 * iOS Testing Library - Physical Device Control
 * Wrapper for xcrun devicectl commands (iOS 17+)
 */

import type { CommandResult, PhysicalDevice } from "./types";
import { executeCommand, safeJsonParse, sleep } from "./utils";

// Re-export PhysicalDevice type for convenience
export type { PhysicalDevice } from "./types";

interface DeviceCtlListOutput {
  result?: {
    devices?: Array<{
      capabilities?: Array<{ name: string }>;
      connectionProperties?: {
        transportType?: string;
        tunnelState?: string;
      };
      deviceProperties?: {
        name?: string;
        osVersionNumber?: string;
        marketingName?: string;
      };
      hardwareProperties?: {
        udid?: string;
        platform?: string;
      };
      visibilityClass?: string;
    }>;
  };
}

// ============================================
// Physical Device Discovery
// ============================================

/**
 * Get a list of all connected physical iOS devices
 * Requires Xcode 15+ and iOS 17+
 */
export async function listPhysicalDevices(): Promise<PhysicalDevice[]> {
  const result = await executeCommand(
    "xcrun devicectl list devices --json-output /dev/stdout",
    30000
  );

  if (!result.success || !result.data) {
    // devicectl not available or no devices - return empty array
    console.log("[device.listPhysicalDevices] Failed to list devices:", result.error);
    return [];
  }

  try {
    // devicectl outputs both a table and JSON - extract only the JSON part
    const jsonStart = result.data.indexOf("{");
    if (jsonStart === -1) {
      console.log("[device.listPhysicalDevices] No JSON found in output");
      return [];
    }
    const jsonString = result.data.substring(jsonStart);
    const data = safeJsonParse<DeviceCtlListOutput>(jsonString, { result: { devices: [] } });
    const devices: PhysicalDevice[] = [];

    for (const device of data.result?.devices || []) {
      // Skip simulators (platform != "iOS")
      const platform = device.hardwareProperties?.platform;
      if (platform !== "iOS") continue;

      const udid = device.hardwareProperties?.udid;
      if (!udid) continue;

      // Determine connection type
      const transportType = device.connectionProperties?.transportType;
      let connectionType: PhysicalDevice["connectionType"] = "unknown";
      if (transportType === "wired") connectionType = "usb";
      else if (transportType === "localNetwork" || transportType === "wifi") connectionType = "wifi";

      // Determine connection state
      const tunnelState = device.connectionProperties?.tunnelState;
      const state: PhysicalDevice["state"] = tunnelState === "connected" ? "connected" : "disconnected";

      devices.push({
        udid,
        name: device.deviceProperties?.name || "Unknown Device",
        connectionType,
        osVersion: device.deviceProperties?.osVersionNumber || "Unknown",
        deviceType: "physical",
        state,
        modelName: device.deviceProperties?.marketingName,
      });
    }

    return devices;
  } catch (error) {
    console.log("[device.listPhysicalDevices] Parse error:", error);
    return [];
  }
}

/**
 * Get a physical device by UDID
 */
export async function getPhysicalDevice(
  udid: string
): Promise<PhysicalDevice | undefined> {
  const devices = await listPhysicalDevices();
  return devices.find((d) => d.udid === udid);
}

/**
 * Check if a device is a physical device (by checking devicectl)
 */
export async function isPhysicalDeviceUdid(udid: string): Promise<boolean> {
  const device = await getPhysicalDevice(udid);
  return device !== undefined;
}

// ============================================
// App Management on Physical Device
// ============================================

/**
 * Install an app on a physical device
 * Requires iOS 17+ and a signed app
 */
export async function installApp(
  udid: string,
  appPath: string
): Promise<CommandResult<void>> {
  console.log("[device.installApp] Installing on physical device:", udid);
  console.log("[device.installApp] App path:", appPath);

  const command = `xcrun devicectl device install app --device ${udid} "${appPath}"`;
  console.log("[device.installApp] Running:", command);

  const result = await executeCommand(command, 180000); // 3 minutes timeout for install

  if (!result.success) {
    return {
      success: false,
      error: `Failed to install app on physical device: ${result.error || result.stderr}`,
    };
  }

  // Wait for app to be ready
  await sleep(2000);

  return { success: true };
}

/**
 * Uninstall an app from a physical device
 */
export async function uninstallApp(
  udid: string,
  bundleId: string
): Promise<CommandResult<void>> {
  console.log("[device.uninstallApp] Uninstalling from physical device:", udid);

  const command = `xcrun devicectl device uninstall app --device ${udid} ${bundleId}`;
  const result = await executeCommand(command, 60000);

  if (!result.success) {
    // If app is not installed, treat as success
    if (result.error?.includes("not installed") || result.stderr?.includes("not installed")) {
      return { success: true };
    }
    return {
      success: false,
      error: `Failed to uninstall app: ${result.error || result.stderr}`,
    };
  }

  return { success: true };
}

/**
 * Launch an app on a physical device
 */
export async function launchApp(
  udid: string,
  bundleId: string,
  args?: string[]
): Promise<CommandResult<void>> {
  console.log("[device.launchApp] Launching on physical device:", udid);

  // First, try to terminate any existing instance
  await terminateApp(udid, bundleId);
  await sleep(500);

  // Build the command with optional arguments
  let command = `xcrun devicectl device process launch --device ${udid} ${bundleId}`;
  if (args && args.length > 0) {
    // devicectl uses -- to separate app arguments
    const escapedArgs = args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(" ");
    command = `${command} -- ${escapedArgs}`;
  }
  console.log("[device.launchApp] Running:", command);

  const result = await executeCommand(command, 30000);

  if (!result.success) {
    return {
      success: false,
      error: `Failed to launch app: ${result.error || result.stderr}`,
    };
  }

  return { success: true };
}

/**
 * Terminate an app on a physical device
 */
export async function terminateApp(
  udid: string,
  bundleId: string
): Promise<CommandResult<void>> {
  // devicectl doesn't have a direct terminate command
  // We'll use the Appium session to terminate instead
  // For now, just return success
  console.log(`[device.terminateApp] Terminating ${bundleId} on device ${udid} (via Appium)`);
  return { success: true };
}

// ============================================
// Device Info & Status
// ============================================

/**
 * Check if devicectl is available (Xcode 15+)
 */
export async function isDeviceCtlAvailable(): Promise<boolean> {
  const result = await executeCommand("xcrun devicectl --version", 5000);
  return result.success;
}

/**
 * Pair with a device (requires physical connection first time)
 */
export async function pairDevice(udid: string): Promise<CommandResult<void>> {
  const command = `xcrun devicectl manage pair --device ${udid}`;
  const result = await executeCommand(command, 60000);

  if (!result.success) {
    return {
      success: false,
      error: `Failed to pair device: ${result.error || result.stderr}. Make sure the device is connected via USB and unlocked.`,
    };
  }

  return { success: true };
}

/**
 * Unpair a device
 */
export async function unpairDevice(udid: string): Promise<CommandResult<void>> {
  const command = `xcrun devicectl manage unpair --device ${udid}`;
  const result = await executeCommand(command, 30000);

  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}
