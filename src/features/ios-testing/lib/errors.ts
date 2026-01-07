/**
 * iOS Testing - Error Utilities
 * Provides consistent error handling across all iOS testing executors
 */

import { NonRetriableError } from "inngest";

/**
 * iOS Testing error codes
 */
export const IOS_ERROR_CODES = {
  // Device errors
  DEVICE_NOT_FOUND: "IOS_DEVICE_NOT_FOUND",
  DEVICE_NOT_BOOTED: "IOS_DEVICE_NOT_BOOTED",
  DEVICE_BOOT_TIMEOUT: "IOS_DEVICE_BOOT_TIMEOUT",

  // App errors
  APP_NOT_FOUND: "IOS_APP_NOT_FOUND",
  APP_INSTALL_FAILED: "IOS_APP_INSTALL_FAILED",
  APP_LAUNCH_FAILED: "IOS_APP_LAUNCH_FAILED",

  // Element errors
  ELEMENT_NOT_FOUND: "IOS_ELEMENT_NOT_FOUND",
  ELEMENT_NOT_INTERACTABLE: "IOS_ELEMENT_NOT_INTERACTABLE",

  // Validation errors
  MISSING_REQUIRED_FIELD: "IOS_MISSING_REQUIRED_FIELD",
  INVALID_VALUE: "IOS_INVALID_VALUE",

  // Execution errors
  TIMEOUT: "IOS_TIMEOUT",
  COMMAND_FAILED: "IOS_COMMAND_FAILED",
  SCREENSHOT_FAILED: "IOS_SCREENSHOT_FAILED",
  COMPARISON_FAILED: "IOS_COMPARISON_FAILED",
} as const;

export type IOSErrorCode =
  (typeof IOS_ERROR_CODES)[keyof typeof IOS_ERROR_CODES];

/**
 * Create a structured iOS error
 */
export function createIOSError(
  code: IOSErrorCode,
  message: string,
  details?: Record<string, unknown>,
): NonRetriableError {
  const error = new NonRetriableError(message);
  (error as unknown as Record<string, unknown>).code = code;
  (error as unknown as Record<string, unknown>).details = details;
  return error;
}

/**
 * Validate required fields and throw if missing
 */
export function validateRequired<T extends Record<string, unknown>>(
  data: T,
  fields: (keyof T)[],
  nodeName: string,
): void {
  for (const field of fields) {
    if (
      data[field] === undefined ||
      data[field] === null ||
      data[field] === ""
    ) {
      throw createIOSError(
        IOS_ERROR_CODES.MISSING_REQUIRED_FIELD,
        `${nodeName}: ${String(field)} is required`,
        { field: String(field) },
      );
    }
  }
}

/**
 * Extract device ID from execution context
 * Searches through all context values for deviceId
 */
export function getDeviceIdFromContext(
  context: Record<string, unknown>,
  nodeName: string,
): string {
  // Check direct simulator object
  const simulator = context.simulator as { deviceId?: string } | undefined;
  if (simulator?.deviceId) {
    return simulator.deviceId;
  }

  // Check direct deviceId
  if (typeof context.deviceId === "string" && context.deviceId) {
    return context.deviceId;
  }

  // Search through all context values to find deviceId
  // This handles cases like wdaSetupResult.deviceId, deviceLaunchResult.deviceId, etc.
  for (const value of Object.values(context)) {
    if (
      value &&
      typeof value === "object" &&
      "deviceId" in value &&
      typeof (value as { deviceId: unknown }).deviceId === "string" &&
      (value as { deviceId: string }).deviceId
    ) {
      return (value as { deviceId: string }).deviceId;
    }
  }

  throw createIOSError(
    IOS_ERROR_CODES.DEVICE_NOT_BOOTED,
    `${nodeName}: No device ID found. Make sure WDA Setup or Simulator Boot runs first.`,
    { context: Object.keys(context) },
  );
}

/**
 * Extract bundle ID from execution context (from app launch step)
 */
export function getBundleIdFromContext(
  context: Record<string, unknown>,
  nodeName: string,
): string | undefined {
  // Search through context values to find bundleId
  for (const value of Object.values(context)) {
    if (
      value &&
      typeof value === "object" &&
      "bundleId" in value &&
      typeof (value as { bundleId: unknown }).bundleId === "string"
    ) {
      return (value as { bundleId: string }).bundleId;
    }
  }

  // Also check direct bundleId
  if (typeof context.bundleId === "string") {
    return context.bundleId;
  }

  return undefined;
}

/**
 * Parse timeout value with default
 */
export function parseTimeout(
  value: string | undefined,
  defaultMs: number,
): number {
  if (!value) return defaultMs;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultMs : parsed;
}

/**
 * Parse threshold value (0-1) with validation
 */
export function parseThreshold(
  value: string | undefined,
  defaultValue: number,
  nodeName: string,
): number {
  if (!value) return defaultValue;
  const parsed = parseFloat(value);

  if (isNaN(parsed) || parsed < 0 || parsed > 1) {
    throw createIOSError(
      IOS_ERROR_CODES.INVALID_VALUE,
      `${nodeName}: Threshold must be between 0 and 1`,
      { value, expected: "0-1" },
    );
  }

  return parsed;
}

/**
 * Wrap executor logic with consistent error handling
 */
export async function withIOSErrorHandling<T>(
  operation: () => Promise<T>,
  nodeName: string,
  onError?: (error: Error) => void,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof NonRetriableError) {
      onError?.(error);
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    const wrappedError = createIOSError(
      IOS_ERROR_CODES.COMMAND_FAILED,
      `${nodeName}: ${message}`,
      { originalError: message },
    );
    onError?.(wrappedError);
    throw wrappedError;
  }
}

/**
 * Format error for display in UI
 */
export function formatErrorForDisplay(error: unknown): {
  message: string;
  code?: string;
  details?: Record<string, unknown>;
} {
  if (error instanceof NonRetriableError) {
    const errWithCode = error as unknown as Record<string, unknown>;
    return {
      message: error.message,
      code: errWithCode.code as string | undefined,
      details: errWithCode.details as Record<string, unknown> | undefined,
    };
  }

  if (error instanceof Error) {
    return { message: error.message };
  }

  return { message: String(error) };
}

/**
 * Real device signing configuration type
 */
export interface RealDeviceSigningConfig {
  xcodeOrgId: string;
  xcodeSigningId?: string;
}

/**
 * Get real device signing config from project
 * Returns undefined if not configured or not a physical device
 */
export async function getSigningConfigFromProject(
  projectId: string | null,
  deviceId: string,
): Promise<RealDeviceSigningConfig | undefined> {
  if (!projectId) return undefined;

  // Import dynamically to avoid circular dependencies
  const { deviceController } = await import("@/lib/ios");
  const prisma = (await import("@/lib/db")).default;

  // Check if this is a physical device
  const isPhysical = await deviceController.isPhysicalDeviceByUdid(deviceId);
  if (!isPhysical) return undefined;

  // Get project signing settings
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { xcodeOrgId: true, xcodeSigningId: true },
  });

  if (!project?.xcodeOrgId) {
    console.warn(
      "[iOS Testing] Physical device detected but no Team ID configured in project settings"
    );
    return undefined;
  }

  return {
    xcodeOrgId: project.xcodeOrgId,
    xcodeSigningId: project.xcodeSigningId || undefined,
  };
}
