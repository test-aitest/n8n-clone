/**
 * iOS Testing Library - Simulator Control
 * Wrapper for xcrun simctl commands
 */

import fs from "fs/promises";
import path from "path";
import type {
  CommandResult,
  ScreenshotResult,
  Simulator,
  SimulatorListResult,
  SimulatorState,
} from "./types";
import {
  escapeShellArg,
  executeCommand,
  executeCommandStream,
  safeJsonParse,
  sleep,
  withRetry,
} from "./utils";

// ============================================
// Simulator Discovery
// ============================================

/**
 * Get a list of all available iOS simulators
 */
export async function listSimulators(): Promise<Simulator[]> {
  const result = await executeCommand("xcrun simctl list devices --json");

  if (!result.success || !result.data) {
    throw new Error(`Failed to list simulators: ${result.error}`);
  }

  const data = safeJsonParse<SimulatorListResult>(result.data, { devices: {} });
  const simulators: Simulator[] = [];

  for (const [runtime, devices] of Object.entries(data.devices)) {
    for (const device of devices) {
      // Only include iOS simulators
      if (runtime.includes("iOS")) {
        simulators.push({
          udid: device.udid,
          name: device.name,
          state: device.state as SimulatorState,
          runtime: runtime.replace("com.apple.CoreSimulator.SimRuntime.", ""),
          deviceType: device.deviceTypeIdentifier.replace(
            "com.apple.CoreSimulator.SimDeviceType.",
            "",
          ),
          isAvailable: device.isAvailable,
        });
      }
    }
  }

  return simulators;
}

/**
 * Get simulator by UDID
 */
export async function getSimulator(
  udid: string,
): Promise<Simulator | undefined> {
  const simulators = await listSimulators();
  return simulators.find((sim) => sim.udid === udid);
}

/**
 * Get the currently booted simulator
 */
export async function getBootedSimulator(): Promise<Simulator | undefined> {
  const simulators = await listSimulators();
  return simulators.find((sim) => sim.state === "Booted");
}

// ============================================
// Simulator Lifecycle
// ============================================

/**
 * Boot a simulator
 */
export async function bootSimulator(
  udid: string,
  timeout = 60000,
): Promise<CommandResult<void>> {
  // Check current state
  const simulator = await getSimulator(udid);
  if (!simulator) {
    return { success: false, error: `Simulator not found: ${udid}` };
  }

  if (simulator.state === "Booted") {
    return { success: true };
  }

  // Boot the simulator
  const result = await executeCommand(
    `xcrun simctl boot ${escapeShellArg(udid)}`,
  );

  if (!result.success) {
    return {
      success: false,
      error: `Failed to boot simulator: ${result.error}`,
    };
  }

  // Wait for simulator to be fully booted
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    const sim = await getSimulator(udid);
    if (sim?.state === "Booted") {
      // Additional wait for the simulator to be fully ready
      await sleep(2000);
      return { success: true };
    }
    await sleep(1000);
  }

  return { success: false, error: "Timeout waiting for simulator to boot" };
}

/**
 * Shutdown a simulator
 */
export async function shutdownSimulator(
  udid: string,
): Promise<CommandResult<void>> {
  const simulator = await getSimulator(udid);
  if (!simulator) {
    return { success: false, error: `Simulator not found: ${udid}` };
  }

  if (simulator.state === "Shutdown") {
    return { success: true };
  }

  const result = await executeCommand(
    `xcrun simctl shutdown ${escapeShellArg(udid)}`,
  );

  if (!result.success) {
    return {
      success: false,
      error: `Failed to shutdown simulator: ${result.error}`,
    };
  }

  return { success: true };
}

/**
 * Shutdown all booted simulators
 */
export async function shutdownAllSimulators(): Promise<CommandResult<void>> {
  const result = await executeCommand("xcrun simctl shutdown all");
  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

/**
 * Erase a simulator (reset to clean state)
 */
export async function eraseSimulator(
  udid: string,
): Promise<CommandResult<void>> {
  // Shutdown first if booted
  const simulator = await getSimulator(udid);
  if (simulator?.state === "Booted") {
    await shutdownSimulator(udid);
    await sleep(2000);
  }

  const result = await executeCommand(
    `xcrun simctl erase ${escapeShellArg(udid)}`,
  );
  return {
    success: result.success,
    error: result.success
      ? undefined
      : `Failed to erase simulator: ${result.error}`,
  };
}

// ============================================
// App Management
// ============================================

/**
 * Install an app on the simulator
 */
export async function installApp(
  udid: string,
  appPath: string,
): Promise<CommandResult<void>> {
  console.log("[simulator.installApp] udid:", udid);
  console.log("[simulator.installApp] appPath:", appPath);

  // Verify app path exists
  try {
    await fs.access(appPath);
    console.log("[simulator.installApp] App path exists");
  } catch {
    console.log("[simulator.installApp] App path NOT found");
    return { success: false, error: `App not found at path: ${appPath}` };
  }

  const command = `xcrun simctl install ${escapeShellArg(udid)} ${escapeShellArg(appPath)}`;
  console.log("[simulator.installApp] Running:", command);

  const result = await executeCommand(command, 120000);

  console.log("[simulator.installApp] Command result:", JSON.stringify(result));

  // Wait a moment after install for app to be ready
  if (result.success) {
    await sleep(2000);
  }

  return {
    success: result.success,
    error: result.success
      ? undefined
      : `Failed to install app: ${result.error}`,
  };
}

/**
 * Uninstall an app from the simulator
 * Returns success even if app is not installed (nothing to uninstall)
 */
export async function uninstallApp(
  udid: string,
  bundleId: string,
): Promise<CommandResult<void>> {
  const command = `xcrun simctl uninstall ${escapeShellArg(udid)} ${escapeShellArg(bundleId)}`;
  console.log("[simulator.uninstallApp] Running:", command);

  const result = await executeCommand(command);

  console.log("[simulator.uninstallApp] Command result:", JSON.stringify(result));

  // If uninstall fails because app is not installed, treat as success
  if (!result.success && result.error?.includes("not found")) {
    console.log("[simulator.uninstallApp] App not found, treating as success");
    return { success: true };
  }

  // Wait a moment after uninstall for filesystem cleanup
  if (result.success) {
    await sleep(1000);
  }

  return {
    success: result.success,
    error: result.success
      ? undefined
      : `Failed to uninstall app: ${result.error}`,
  };
}

/**
 * Launch an app on the simulator
 */
export async function launchApp(
  udid: string,
  bundleId: string,
  args: string[] = [],
  env: Record<string, string> = {},
): Promise<CommandResult<{ pid?: number }>> {
  // Build environment variables
  const envArgs = Object.entries(env)
    .map(
      ([key, value]) =>
        `--setenv ${escapeShellArg(key)}=${escapeShellArg(value)}`,
    )
    .join(" ");

  // Build launch arguments
  const launchArgs = args.map((arg) => escapeShellArg(arg)).join(" ");

  // Build command parts, filtering out empty strings
  const commandParts = [
    "xcrun simctl launch",
    envArgs,
    escapeShellArg(udid),
    escapeShellArg(bundleId),
    launchArgs,
  ].filter(Boolean);

  const command = commandParts.join(" ");

  const result = await executeCommand(command);

  if (!result.success) {
    return { success: false, error: `Failed to launch app: ${result.error}` };
  }

  // Parse PID from output (format: "bundleId: pid")
  const pidMatch = result.data?.match(/:?\s*(\d+)\s*$/);
  const pid = pidMatch ? parseInt(pidMatch[1], 10) : undefined;

  return { success: true, data: { pid } };
}

/**
 * Terminate an app on the simulator
 */
export async function terminateApp(
  udid: string,
  bundleId: string,
): Promise<CommandResult<void>> {
  const result = await executeCommand(
    `xcrun simctl terminate ${escapeShellArg(udid)} ${escapeShellArg(bundleId)}`,
  );

  return {
    success: result.success,
    error: result.success
      ? undefined
      : `Failed to terminate app: ${result.error}`,
  };
}

/**
 * Get the list of installed apps on the simulator
 */
export async function listInstalledApps(udid: string): Promise<string[]> {
  const result = await executeCommand(
    `xcrun simctl listapps ${escapeShellArg(udid)} | grep CFBundleIdentifier | awk '{print $3}' | tr -d '";'`,
  );

  if (!result.success || !result.data) {
    return [];
  }

  return result.data.split("\n").filter(Boolean);
}

// ============================================
// Screenshot & Video
// ============================================

/**
 * Take a screenshot of the simulator
 */
export async function takeScreenshot(
  udid: string,
  outputPath?: string,
): Promise<ScreenshotResult> {
  const finalPath =
    outputPath || path.join("/tmp", `screenshot_${Date.now()}.png`);

  const result = await executeCommand(
    `xcrun simctl io ${escapeShellArg(udid)} screenshot ${escapeShellArg(finalPath)}`,
  );

  if (!result.success) {
    return {
      success: false,
      path: finalPath,
    };
  }

  // Read the file as buffer
  let buffer: Buffer | undefined;
  try {
    buffer = await fs.readFile(finalPath);
  } catch {
    // Buffer is optional, so we can continue without it
  }

  return {
    success: true,
    path: finalPath,
    buffer,
  };
}

/**
 * Start recording video of the simulator
 * Returns a function to stop recording
 */
export function startVideoRecording(
  udid: string,
  outputPath: string,
): {
  stop: () => Promise<CommandResult<void>>;
  promise: Promise<CommandResult<void>>;
} {
  let stopped = false;
  let resolveStop: (value: CommandResult<void>) => void;

  const promise = new Promise<CommandResult<void>>((resolve) => {
    resolveStop = resolve;
  });

  const child = executeCommandStream(
    "xcrun",
    ["simctl", "io", udid, "recordVideo", outputPath],
    undefined,
    undefined,
  );

  const stop = async (): Promise<CommandResult<void>> => {
    if (stopped) {
      return { success: true };
    }
    stopped = true;

    // Send SIGINT to stop recording gracefully
    await executeCommand("pkill -SIGINT -f 'simctl io.*recordVideo'");

    // Wait for the recording to finish
    const result = await child;
    resolveStop(result);
    return result;
  };

  return { stop, promise };
}

// ============================================
// Device Status & Info
// ============================================

/**
 * Open the Simulator.app and focus on a specific device
 */
export async function openSimulator(
  udid: string,
): Promise<CommandResult<void>> {
  const result = await executeCommand(
    `open -a Simulator --args -CurrentDeviceUDID ${escapeShellArg(udid)}`,
  );

  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

/**
 * Get the status bar time for a simulator
 */
export async function setStatusBarTime(
  udid: string,
  time: string,
): Promise<CommandResult<void>> {
  const result = await executeCommand(
    `xcrun simctl status_bar ${escapeShellArg(udid)} override --time ${escapeShellArg(time)}`,
  );

  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

/**
 * Clear status bar overrides
 */
export async function clearStatusBarOverrides(
  udid: string,
): Promise<CommandResult<void>> {
  const result = await executeCommand(
    `xcrun simctl status_bar ${escapeShellArg(udid)} clear`,
  );

  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

// ============================================
// Permissions
// ============================================

/**
 * Grant or revoke app permissions
 */
export async function setAppPermission(
  udid: string,
  bundleId: string,
  permission: string,
  value: "grant" | "revoke" | "reset",
): Promise<CommandResult<void>> {
  const command =
    value === "reset"
      ? `xcrun simctl privacy ${escapeShellArg(udid)} reset ${permission} ${escapeShellArg(bundleId)}`
      : `xcrun simctl privacy ${escapeShellArg(udid)} ${value} ${permission} ${escapeShellArg(bundleId)}`;

  const result = await executeCommand(command);

  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

// ============================================
// URL & Deep Links
// ============================================

/**
 * Open a URL in the simulator
 */
export async function openURL(
  udid: string,
  url: string,
): Promise<CommandResult<void>> {
  const result = await executeCommand(
    `xcrun simctl openurl ${escapeShellArg(udid)} ${escapeShellArg(url)}`,
  );

  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

// ============================================
// Spawn Process
// ============================================

/**
 * Spawn a process inside the simulator
 */
export async function spawnProcess(
  udid: string,
  executable: string,
  args: string[] = [],
): Promise<CommandResult<string>> {
  const command = `xcrun simctl spawn ${escapeShellArg(udid)} ${escapeShellArg(executable)} ${args.map(escapeShellArg).join(" ")}`;
  return executeCommand(command);
}
