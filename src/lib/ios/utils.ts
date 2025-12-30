/**
 * iOS Testing Library - Utility Functions
 * Common utilities for iOS automation
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import type { CommandResult, UIElement } from "./types";

const execAsync = promisify(exec);

// ============================================
// Command Execution
// ============================================

/**
 * Execute a shell command and return the result
 */
export async function executeCommand(
  command: string,
  timeout = 30000
): Promise<CommandResult<string>> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large outputs
    });

    return {
      success: true,
      data: stdout.trim(),
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error) {
    const execError = error as {
      code?: number;
      stdout?: string;
      stderr?: string;
      message?: string;
    };
    return {
      success: false,
      error: execError.message || "Command execution failed",
      stdout: execError.stdout?.trim(),
      stderr: execError.stderr?.trim(),
      exitCode: execError.code,
    };
  }
}

/**
 * Execute a command with streaming output
 */
export function executeCommandStream(
  command: string,
  args: string[],
  onStdout?: (data: string) => void,
  onStderr?: (data: string) => void
): Promise<CommandResult<void>> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      const str = data.toString();
      stdout += str;
      onStdout?.(str);
    });

    child.stderr?.on("data", (data: Buffer) => {
      const str = data.toString();
      stderr += str;
      onStderr?.(str);
    });

    child.on("close", (code) => {
      resolve({
        success: code === 0,
        exitCode: code ?? undefined,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error: code !== 0 ? stderr.trim() || "Command failed" : undefined,
      });
    });

    child.on("error", (error) => {
      resolve({
        success: false,
        error: error.message,
      });
    });
  });
}

// ============================================
// UI Element Utilities
// ============================================

/**
 * Find an element by accessibility identifier in a UI hierarchy
 */
export function findElementByAccessibilityId(
  elements: UIElement[],
  accessibilityId: string
): UIElement | undefined {
  for (const element of elements) {
    if (element.AXIdentifier === accessibilityId) {
      return element;
    }
    if (element.AXChildren) {
      const found = findElementByAccessibilityId(element.AXChildren, accessibilityId);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

/**
 * Find all elements matching a predicate
 */
export function findElements(
  elements: UIElement[],
  predicate: (element: UIElement) => boolean
): UIElement[] {
  const results: UIElement[] = [];

  function traverse(elems: UIElement[]) {
    for (const element of elems) {
      if (predicate(element)) {
        results.push(element);
      }
      if (element.AXChildren) {
        traverse(element.AXChildren);
      }
    }
  }

  traverse(elements);
  return results;
}

/**
 * Get the center point of an element's frame
 */
export function getElementCenter(element: UIElement): { x: number; y: number } | null {
  if (!element.AXFrame) {
    return null;
  }

  return {
    x: element.AXFrame.x + element.AXFrame.width / 2,
    y: element.AXFrame.y + element.AXFrame.height / 2,
  };
}

/**
 * Flatten UI hierarchy into a list
 */
export function flattenHierarchy(elements: UIElement[]): UIElement[] {
  const result: UIElement[] = [];

  function traverse(elems: UIElement[]) {
    for (const element of elems) {
      result.push(element);
      if (element.AXChildren) {
        traverse(element.AXChildren);
      }
    }
  }

  traverse(elements);
  return result;
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate a Bundle ID format
 */
export function isValidBundleId(bundleId: string): boolean {
  // Bundle ID format: reverse-DNS style identifier
  const bundleIdRegex = /^[a-zA-Z][a-zA-Z0-9-]*(\.[a-zA-Z][a-zA-Z0-9-]*)+$/;
  return bundleIdRegex.test(bundleId);
}

/**
 * Validate a UDID format
 */
export function isValidUDID(udid: string): boolean {
  // UDID format: UUID-style or older format
  const uuidRegex = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/;
  const oldFormatRegex = /^[0-9A-Fa-f]{40}$/;
  return uuidRegex.test(udid) || oldFormatRegex.test(udid);
}

/**
 * Sanitize path to prevent path traversal attacks
 */
export function sanitizePath(path: string, baseDir?: string): string {
  // Remove potentially dangerous characters
  const sanitized = path
    .replace(/\.\./g, "")
    .replace(/\/\//g, "/")
    .replace(/[<>:"|?*]/g, "");

  if (baseDir) {
    // Ensure the path is within the base directory
    const fullPath = sanitized.startsWith("/") ? sanitized : `${baseDir}/${sanitized}`;
    if (!fullPath.startsWith(baseDir)) {
      throw new Error("Path traversal detected");
    }
  }

  return sanitized;
}

// ============================================
// Retry Utilities
// ============================================

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    factor?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2,
    onRetry,
  } = options;

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        break;
      }

      onRetry?.(attempt, lastError);

      await sleep(delay);
      delay = Math.min(delay * factor, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor<T>(
  fn: () => Promise<T | null | undefined>,
  options: {
    timeout?: number;
    interval?: number;
    errorMessage?: string;
  } = {}
): Promise<T> {
  const { timeout = 10000, interval = 500, errorMessage = "Timeout waiting for condition" } = options;

  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await fn();
    if (result !== null && result !== undefined) {
      return result;
    }
    await sleep(interval);
  }

  throw new Error(errorMessage);
}

// ============================================
// Time Utilities
// ============================================

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get current timestamp in ISO format
 */
export function timestamp(): string {
  return new Date().toISOString();
}

// ============================================
// File Path Utilities
// ============================================

/**
 * Generate a unique filename for screenshots
 */
export function generateScreenshotFilename(prefix = "screenshot"): string {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[:.]/g, "-");
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${dateStr}_${random}.png`;
}

/**
 * Escape shell arguments
 */
export function escapeShellArg(arg: string): string {
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

// ============================================
// JSON Utilities
// ============================================

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
}
