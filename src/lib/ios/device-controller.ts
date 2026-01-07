/**
 * iOS Testing Library - Unified Device Controller
 * Provides a single interface for both simulators and physical devices
 */

import type {
  CommandResult,
  DeviceInfo,
} from "./types";
import { isPhysicalDevice } from "./types";
import * as simulator from "./simulator";
import * as device from "./device";

// ============================================
// Unified Device Discovery
// ============================================

/**
 * List all available iOS devices (both simulators and physical devices)
 */
export async function listAllDevices(): Promise<DeviceInfo[]> {
  const [simulators, physicalDevices] = await Promise.all([
    simulator.listSimulators(),
    device.listPhysicalDevices(),
  ]);

  return [...physicalDevices, ...simulators];
}

/**
 * Get a device by UDID (checks both simulators and physical devices)
 */
export async function getDevice(udid: string): Promise<DeviceInfo | undefined> {
  // Check physical devices first (faster)
  const physicalDevice = await device.getPhysicalDevice(udid);
  if (physicalDevice) {
    return physicalDevice;
  }

  // Check simulators
  return simulator.getSimulator(udid);
}

/**
 * Check if a UDID belongs to a physical device
 */
export async function isPhysicalDeviceByUdid(udid: string): Promise<boolean> {
  const dev = await device.getPhysicalDevice(udid);
  return dev !== undefined;
}

// ============================================
// Unified App Management
// ============================================

/**
 * Install an app on any device (simulator or physical)
 */
export async function installApp(
  udid: string,
  appPath: string
): Promise<CommandResult<void>> {
  const isPhysical = await isPhysicalDeviceByUdid(udid);

  if (isPhysical) {
    console.log("[device-controller] Installing on physical device");
    return device.installApp(udid, appPath);
  }

  console.log("[device-controller] Installing on simulator");
  return simulator.installApp(udid, appPath);
}

/**
 * Uninstall an app from any device
 */
export async function uninstallApp(
  udid: string,
  bundleId: string
): Promise<CommandResult<void>> {
  const isPhysical = await isPhysicalDeviceByUdid(udid);

  if (isPhysical) {
    return device.uninstallApp(udid, bundleId);
  }

  return simulator.uninstallApp(udid, bundleId);
}

/**
 * Launch an app on any device
 */
export async function launchApp(
  udid: string,
  bundleId: string,
  args: string[] = [],
  env: Record<string, string> = {}
): Promise<CommandResult<{ pid?: number }>> {
  const isPhysical = await isPhysicalDeviceByUdid(udid);

  if (isPhysical) {
    console.log("[device-controller] Launching on physical device");
    const result = await device.launchApp(udid, bundleId);
    return { success: result.success, error: result.error, data: {} };
  }

  console.log("[device-controller] Launching on simulator");
  return simulator.launchApp(udid, bundleId, args, env);
}

/**
 * Terminate an app on any device
 */
export async function terminateApp(
  udid: string,
  bundleId: string
): Promise<CommandResult<void>> {
  const isPhysical = await isPhysicalDeviceByUdid(udid);

  if (isPhysical) {
    return device.terminateApp(udid, bundleId);
  }

  return simulator.terminateApp(udid, bundleId);
}

// ============================================
// Unified Device Lifecycle
// ============================================

/**
 * Boot a simulator or connect to a physical device
 * For physical devices, this is a no-op (devices are always "booted")
 */
export async function bootDevice(
  udid: string,
  timeout = 60000
): Promise<CommandResult<void>> {
  const isPhysical = await isPhysicalDeviceByUdid(udid);

  if (isPhysical) {
    // Physical devices don't need booting
    // Just verify the device is connected
    const dev = await device.getPhysicalDevice(udid);
    if (!dev) {
      return { success: false, error: "Physical device not found" };
    }
    if (dev.state !== "connected") {
      return { success: false, error: "Physical device not connected. Please connect via USB or WiFi." };
    }
    return { success: true };
  }

  return simulator.bootSimulator(udid, timeout);
}

/**
 * Shutdown a simulator or disconnect from physical device
 * For physical devices, this is a no-op
 */
export async function shutdownDevice(
  udid: string
): Promise<CommandResult<void>> {
  const isPhysical = await isPhysicalDeviceByUdid(udid);

  if (isPhysical) {
    // Physical devices can't be "shut down" programmatically
    return { success: true };
  }

  return simulator.shutdownSimulator(udid);
}

// ============================================
// Screenshot (unified via WDA for physical devices)
// ============================================

/**
 * Take a screenshot on any device
 * Note: For physical devices, use WDA screenshot instead
 */
export async function takeScreenshot(
  udid: string,
  outputPath?: string
): Promise<CommandResult<{ path?: string; base64?: string }>> {
  const isPhysical = await isPhysicalDeviceByUdid(udid);

  if (isPhysical) {
    // For physical devices, screenshots must be taken via WDA
    // Return a message indicating this
    return {
      success: false,
      error: "Use WDA takeScreenshot for physical devices",
    };
  }

  const result = await simulator.takeScreenshot(udid, outputPath);
  return {
    success: result.success,
    data: result.success ? { path: result.path } : undefined,
  };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get device display name with type indicator
 */
export function getDeviceDisplayName(dev: DeviceInfo): string {
  if (isPhysicalDevice(dev)) {
    const connectionIcon = dev.connectionType === "usb" ? "🔌" : "📶";
    return `${connectionIcon} ${dev.name} (${dev.osVersion})`;
  }
  return `💻 ${dev.name} (${dev.runtime})`;
}

/**
 * Get device type string
 */
export function getDeviceTypeLabel(dev: DeviceInfo): string {
  return isPhysicalDevice(dev) ? "Physical Device" : "Simulator";
}

/**
 * Check if a device is ready for testing
 */
export async function isDeviceReady(udid: string): Promise<boolean> {
  const dev = await getDevice(udid);
  if (!dev) return false;

  if (isPhysicalDevice(dev)) {
    return dev.state === "connected";
  }

  return dev.state === "Booted";
}
