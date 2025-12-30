/**
 * iOS Testing Library - IDB (iOS Development Bridge) Control
 * Wrapper for idb commands for UI automation
 *
 * idb installation:
 * - brew install idb-companion
 * - pip install fb-idb
 */

import type {
  UIHierarchy,
  UIElement,
  CommandResult,
  TapResult,
  TextInputResult,
  SwipeResult,
  SwipeDirection,
  HardwareButton,
} from "./types";
import {
  executeCommand,
  safeJsonParse,
  escapeShellArg,
  waitFor,
  findElementByAccessibilityId,
  getElementCenter,
  sleep,
} from "./utils";

// ============================================
// UI Hierarchy
// ============================================

/**
 * Get the complete UI hierarchy of the current screen
 */
export async function describeAll(udid: string): Promise<UIHierarchy> {
  const result = await executeCommand(
    `idb ui describe-all --udid ${escapeShellArg(udid)} --json`,
    30000
  );

  if (!result.success || !result.data) {
    throw new Error(`Failed to describe UI: ${result.error}`);
  }

  const elements = safeJsonParse<UIElement[]>(result.data, []);

  return {
    elements,
    timestamp: new Date(),
  };
}

/**
 * Describe UI element at a specific point
 */
export async function describePoint(
  udid: string,
  x: number,
  y: number
): Promise<UIElement | null> {
  const result = await executeCommand(
    `idb ui describe-point --udid ${escapeShellArg(udid)} ${x} ${y} --json`
  );

  if (!result.success || !result.data) {
    return null;
  }

  return safeJsonParse<UIElement | null>(result.data, null);
}

// ============================================
// Tap Operations
// ============================================

/**
 * Tap on an element by accessibility identifier
 */
export async function tap(
  udid: string,
  accessibilityId: string,
  timeout = 10000
): Promise<TapResult> {
  // First, find the element
  const element = await waitForElement(udid, accessibilityId, timeout);

  if (!element) {
    return { success: false, elementFound: false };
  }

  const center = getElementCenter(element);
  if (!center) {
    return { success: false, elementFound: true };
  }

  // Tap at the center of the element
  return tapCoordinate(udid, center.x, center.y);
}

/**
 * Tap at specific coordinates
 */
export async function tapCoordinate(
  udid: string,
  x: number,
  y: number
): Promise<TapResult> {
  const result = await executeCommand(
    `idb ui tap --udid ${escapeShellArg(udid)} ${x} ${y}`
  );

  return {
    success: result.success,
    elementFound: true,
  };
}

/**
 * Double tap at specific coordinates
 */
export async function doubleTap(
  udid: string,
  x: number,
  y: number
): Promise<TapResult> {
  const result = await executeCommand(
    `idb ui tap --udid ${escapeShellArg(udid)} ${x} ${y} --duration 0.1 && idb ui tap --udid ${escapeShellArg(udid)} ${x} ${y}`
  );

  return {
    success: result.success,
    elementFound: true,
  };
}

/**
 * Long press at specific coordinates
 */
export async function longPress(
  udid: string,
  x: number,
  y: number,
  duration = 1.0
): Promise<TapResult> {
  const result = await executeCommand(
    `idb ui tap --udid ${escapeShellArg(udid)} ${x} ${y} --duration ${duration}`
  );

  return {
    success: result.success,
    elementFound: true,
  };
}

// ============================================
// Text Input
// ============================================

/**
 * Type text into the currently focused field
 */
export async function typeText(
  udid: string,
  text: string
): Promise<TextInputResult> {
  const result = await executeCommand(
    `idb ui text --udid ${escapeShellArg(udid)} ${escapeShellArg(text)}`
  );

  return {
    success: result.success,
    textEntered: result.success ? text : "",
  };
}

/**
 * Type text into a specific field by accessibility identifier
 */
export async function typeTextInField(
  udid: string,
  accessibilityId: string,
  text: string,
  clearFirst = true
): Promise<TextInputResult> {
  // First, tap the field to focus it
  const tapResult = await tap(udid, accessibilityId);
  if (!tapResult.success) {
    return { success: false, textEntered: "" };
  }

  // Small delay for focus
  await sleep(300);

  // Clear existing text if requested
  if (clearFirst) {
    // Select all and delete
    await executeCommand(
      `idb ui key --udid ${escapeShellArg(udid)} 1 --modifier command` // Cmd+A
    );
    await sleep(100);
    await executeCommand(
      `idb ui key --udid ${escapeShellArg(udid)} 51` // Delete key
    );
    await sleep(100);
  }

  // Type the new text
  return typeText(udid, text);
}

/**
 * Send a key event
 */
export async function sendKey(
  udid: string,
  keyCode: number,
  modifier?: "command" | "shift" | "option" | "control"
): Promise<CommandResult<void>> {
  let command = `idb ui key --udid ${escapeShellArg(udid)} ${keyCode}`;
  if (modifier) {
    command += ` --modifier ${modifier}`;
  }

  const result = await executeCommand(command);
  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

// ============================================
// Swipe & Scroll
// ============================================

/**
 * Swipe from one point to another
 */
export async function swipe(
  udid: string,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  duration = 0.5
): Promise<SwipeResult> {
  const result = await executeCommand(
    `idb ui swipe --udid ${escapeShellArg(udid)} ${startX} ${startY} ${endX} ${endY} --duration ${duration}`
  );

  // Determine direction based on coordinates
  const dx = endX - startX;
  const dy = endY - startY;
  let direction: SwipeDirection;

  if (Math.abs(dx) > Math.abs(dy)) {
    direction = dx > 0 ? "right" : "left";
  } else {
    direction = dy > 0 ? "down" : "up";
  }

  return {
    success: result.success,
    direction,
  };
}

/**
 * Swipe in a direction from the center of the screen
 */
export async function swipeDirection(
  udid: string,
  direction: SwipeDirection,
  distance = 300
): Promise<SwipeResult> {
  // Default screen center (adjust based on actual device dimensions)
  const centerX = 195; // iPhone 14 Pro width / 2
  const centerY = 422; // iPhone 14 Pro height / 2

  let startX = centerX;
  let startY = centerY;
  let endX = centerX;
  let endY = centerY;

  switch (direction) {
    case "up":
      endY = centerY - distance;
      break;
    case "down":
      endY = centerY + distance;
      break;
    case "left":
      endX = centerX - distance;
      break;
    case "right":
      endX = centerX + distance;
      break;
  }

  return swipe(udid, startX, startY, endX, endY);
}

/**
 * Scroll until an element becomes visible
 */
export async function scrollUntilVisible(
  udid: string,
  accessibilityId: string,
  direction: "up" | "down" = "down",
  maxScrolls = 10,
  scrollDistance = 300
): Promise<{ found: boolean; scrollCount: number }> {
  for (let i = 0; i < maxScrolls; i++) {
    // Check if element is visible
    const element = await findElement(udid, accessibilityId);
    if (element) {
      return { found: true, scrollCount: i };
    }

    // Scroll in the specified direction
    // To scroll down (see content below), swipe up
    const swipeDir = direction === "down" ? "up" : "down";
    await swipeDirection(udid, swipeDir, scrollDistance);
    await sleep(500); // Wait for scroll animation
  }

  return { found: false, scrollCount: maxScrolls };
}

// ============================================
// Hardware Buttons
// ============================================

/**
 * Press a hardware button
 */
export async function pressButton(
  udid: string,
  button: HardwareButton
): Promise<CommandResult<void>> {
  const buttonMap: Record<HardwareButton, string> = {
    HOME: "HOME",
    LOCK: "LOCK",
    SIRI: "SIRI",
    VOLUME_UP: "VOLUME_UP",
    VOLUME_DOWN: "VOLUME_DOWN",
    APPLE_PAY: "APPLE_PAY",
  };

  const result = await executeCommand(
    `idb ui button --udid ${escapeShellArg(udid)} ${buttonMap[button]}`
  );

  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

// ============================================
// Element Operations
// ============================================

/**
 * Find an element by accessibility identifier
 */
export async function findElement(
  udid: string,
  accessibilityId: string
): Promise<UIElement | undefined> {
  const hierarchy = await describeAll(udid);
  return findElementByAccessibilityId(hierarchy.elements, accessibilityId);
}

/**
 * Check if an element exists
 */
export async function elementExists(
  udid: string,
  accessibilityId: string
): Promise<boolean> {
  const element = await findElement(udid, accessibilityId);
  return element !== undefined;
}

/**
 * Wait for an element to appear
 */
export async function waitForElement(
  udid: string,
  accessibilityId: string,
  timeout = 10000
): Promise<UIElement | undefined> {
  try {
    return await waitFor(
      () => findElement(udid, accessibilityId),
      {
        timeout,
        interval: 500,
        errorMessage: `Element not found: ${accessibilityId}`,
      }
    );
  } catch {
    return undefined;
  }
}

/**
 * Get the value of an element (AXValue)
 */
export async function getElementValue(
  udid: string,
  accessibilityId: string
): Promise<string | undefined> {
  const element = await findElement(udid, accessibilityId);
  return element?.AXValue;
}

/**
 * Get the label of an element (AXLabel)
 */
export async function getElementLabel(
  udid: string,
  accessibilityId: string
): Promise<string | undefined> {
  const element = await findElement(udid, accessibilityId);
  return element?.AXLabel;
}

/**
 * Check if an element is enabled
 */
export async function isElementEnabled(
  udid: string,
  accessibilityId: string
): Promise<boolean> {
  const element = await findElement(udid, accessibilityId);
  return element?.AXEnabled ?? false;
}

// ============================================
// Picker Operations
// ============================================

/**
 * Select a value in a Picker (wheel style)
 * This requires calculating the swipe needed to reach the target value
 */
export async function selectPickerValue(
  udid: string,
  accessibilityId: string,
  targetValue: string
): Promise<CommandResult<void>> {
  // First, find the picker element
  const element = await findElement(udid, accessibilityId);
  if (!element) {
    return { success: false, error: "Picker not found" };
  }

  const center = getElementCenter(element);
  if (!center) {
    return { success: false, error: "Could not determine picker position" };
  }

  // For picker wheels, we need to swipe up or down to change values
  // This is a simplified implementation - a real one would need to
  // read the current value and calculate the number of swipes needed
  const maxAttempts = 20;

  for (let i = 0; i < maxAttempts; i++) {
    // Check current value
    const currentElement = await findElement(udid, accessibilityId);
    if (currentElement?.AXValue === targetValue) {
      return { success: true };
    }

    // Swipe to change value
    await swipe(
      udid,
      center.x,
      center.y,
      center.x,
      center.y - 50, // Small swipe up
      0.3
    );
    await sleep(300);
  }

  return { success: false, error: "Could not select picker value" };
}

// ============================================
// Slider Operations
// ============================================

/**
 * Set a slider to a specific value (0.0 - 1.0)
 */
export async function setSliderValue(
  udid: string,
  accessibilityId: string,
  value: number
): Promise<CommandResult<void>> {
  if (value < 0 || value > 1) {
    return { success: false, error: "Slider value must be between 0 and 1" };
  }

  const element = await findElement(udid, accessibilityId);
  if (!element || !element.AXFrame) {
    return { success: false, error: "Slider not found" };
  }

  const { x, y, width, height } = element.AXFrame;
  const centerY = y + height / 2;

  // Calculate target X position based on value
  const startX = x;
  const endX = x + width;
  const targetX = startX + (endX - startX) * value;

  // Tap at the target position
  const result = await tapCoordinate(udid, targetX, centerY);

  return {
    success: result.success,
    error: result.success ? undefined : "Failed to set slider value",
  };
}

// ============================================
// Toggle Operations
// ============================================

/**
 * Toggle a switch to a specific state
 */
export async function toggleSwitch(
  udid: string,
  accessibilityId: string,
  targetState?: boolean
): Promise<CommandResult<{ newState: boolean }>> {
  const element = await findElement(udid, accessibilityId);
  if (!element) {
    return { success: false, error: "Toggle not found" };
  }

  // Get current state from AXValue (typically "1" for ON, "0" for OFF)
  const currentState = element.AXValue === "1";

  // If target state is specified and matches current, no action needed
  if (targetState !== undefined && targetState === currentState) {
    return { success: true, data: { newState: currentState } };
  }

  // Tap to toggle
  const tapResult = await tap(udid, accessibilityId);
  if (!tapResult.success) {
    return { success: false, error: "Failed to tap toggle" };
  }

  // Wait for animation
  await sleep(300);

  // Verify new state
  const newElement = await findElement(udid, accessibilityId);
  const newState = newElement?.AXValue === "1";

  return { success: true, data: { newState } };
}

// ============================================
// Focus Management
// ============================================

/**
 * Get the currently focused element
 */
export async function getFocusedElement(udid: string): Promise<UIElement | undefined> {
  const hierarchy = await describeAll(udid);

  function findFocused(elements: UIElement[]): UIElement | undefined {
    for (const element of elements) {
      if (element.AXFocused) {
        return element;
      }
      if (element.AXChildren) {
        const found = findFocused(element.AXChildren);
        if (found) return found;
      }
    }
    return undefined;
  }

  return findFocused(hierarchy.elements);
}

// ============================================
// IDB Connection
// ============================================

/**
 * Connect idb to a simulator
 */
export async function connect(udid: string): Promise<CommandResult<void>> {
  const result = await executeCommand(
    `idb connect ${escapeShellArg(udid)}`
  );

  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

/**
 * Disconnect idb from a simulator
 */
export async function disconnect(udid: string): Promise<CommandResult<void>> {
  const result = await executeCommand(
    `idb disconnect ${escapeShellArg(udid)}`
  );

  return {
    success: result.success,
    error: result.success ? undefined : result.error,
  };
}

/**
 * List connected targets
 */
export async function listTargets(): Promise<string[]> {
  const result = await executeCommand("idb list-targets --json");

  if (!result.success || !result.data) {
    return [];
  }

  const targets = safeJsonParse<Array<{ udid: string }>>(result.data, []);
  return targets.map((t) => t.udid);
}
