/**
 * iOS Testing Library - WebDriverAgent (WDA) Client
 * Uses Appium with XCUITest driver for proper SwiftUI accessibility support
 *
 * Setup:
 * - npm install -g appium
 * - appium driver install xcuitest
 * - Start Appium: appium
 */

import type { CommandResult, TapResult, TextInputResult, SwipeDirection, SwipeResult } from "./types";

// ============================================
// Types
// ============================================

interface WDASession {
  sessionId: string;
  udid: string;
  bundleId: string;
}

interface WDAElement {
  ELEMENT: string;
  "element-6066-11e4-a52e-4f735466cecf"?: string;
}

interface WDAElementInfo {
  type: string;
  label: string | null;
  name: string | null; // accessibility identifier
  value: string | null;
  rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  enabled: boolean;
  displayed: boolean;
}

// ============================================
// Configuration
// ============================================

const APPIUM_HOST = process.env.APPIUM_HOST || "127.0.0.1";
const APPIUM_PORT = process.env.APPIUM_PORT || "4723";
const APPIUM_BASE_URL = `http://${APPIUM_HOST}:${APPIUM_PORT}`;

// Active sessions cache
const activeSessions = new Map<string, WDASession>();

// ============================================
// HTTP Helpers
// ============================================

async function wdaRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`${APPIUM_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const result = await response.json();

    if (result.value && result.value.error) {
      return { success: false, error: result.value.message || result.value.error };
    }

    return { success: true, data: result.value };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Request failed",
    };
  }
}

// ============================================
// Session Management
// ============================================

/**
 * Create a new Appium session for a simulator
 */
export async function createSession(
  udid: string,
  bundleId: string,
): Promise<CommandResult<WDASession>> {
  // Check if session already exists
  const existingSession = activeSessions.get(udid);
  if (existingSession && existingSession.bundleId === bundleId) {
    return { success: true, data: existingSession };
  }

  // Close existing session if bundle ID is different
  if (existingSession) {
    await deleteSession(udid);
  }

  const capabilities = {
    capabilities: {
      alwaysMatch: {
        platformName: "iOS",
        "appium:automationName": "XCUITest",
        "appium:udid": udid,
        "appium:bundleId": bundleId,
        "appium:noReset": true,
        "appium:shouldTerminateApp": false,
        "appium:skipServerInstallation": false,
        "appium:usePreinstalledWDA": false,
        "appium:wdaLaunchTimeout": 120000,
        "appium:wdaConnectionTimeout": 120000,
      },
    },
  };

  const result = await wdaRequest<{ sessionId: string }>(
    "POST",
    "/session",
    capabilities,
  );

  if (!result.success || !result.data?.sessionId) {
    return {
      success: false,
      error: result.error || "Failed to create session",
    };
  }

  const session: WDASession = {
    sessionId: result.data.sessionId,
    udid,
    bundleId,
  };

  activeSessions.set(udid, session);

  return { success: true, data: session };
}

/**
 * Delete an Appium session
 */
export async function deleteSession(udid: string): Promise<CommandResult<void>> {
  const session = activeSessions.get(udid);
  if (!session) {
    return { success: true };
  }

  await wdaRequest("DELETE", `/session/${session.sessionId}`);
  activeSessions.delete(udid);

  return { success: true };
}

/**
 * Get or create a session for a device
 */
async function getSession(udid: string): Promise<WDASession | null> {
  return activeSessions.get(udid) || null;
}

// ============================================
// Element Operations
// ============================================

/**
 * Find an element by accessibility identifier
 * Tries multiple strategies for SwiftUI compatibility:
 * 1. accessibility id (standard)
 * 2. iOS predicate with identifier
 * 3. iOS predicate with name
 * 4. iOS predicate with label
 */
export async function findElementByAccessibilityId(
  udid: string,
  accessibilityId: string,
  timeout = 10000,
): Promise<CommandResult<WDAElement>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session for this device" };
  }

  // Use shorter implicit wait for each attempt
  const attemptTimeout = Math.min(timeout / 4, 2500);
  await wdaRequest("POST", `/session/${session.sessionId}/timeouts`, {
    implicit: attemptTimeout,
  });

  // Strategy 1: Standard accessibility id
  const result1 = await wdaRequest<WDAElement>(
    "POST",
    `/session/${session.sessionId}/element`,
    {
      using: "accessibility id",
      value: accessibilityId,
    },
  );
  if (result1.success && result1.data) {
    return { success: true, data: result1.data };
  }

  // Strategy 2: iOS predicate with identifier
  const result2 = await wdaRequest<WDAElement>(
    "POST",
    `/session/${session.sessionId}/element`,
    {
      using: "-ios predicate string",
      value: `identifier == "${accessibilityId}"`,
    },
  );
  if (result2.success && result2.data) {
    return { success: true, data: result2.data };
  }

  // Strategy 3: iOS predicate with name
  const result3 = await wdaRequest<WDAElement>(
    "POST",
    `/session/${session.sessionId}/element`,
    {
      using: "-ios predicate string",
      value: `name == "${accessibilityId}"`,
    },
  );
  if (result3.success && result3.data) {
    return { success: true, data: result3.data };
  }

  // Strategy 4: iOS predicate with label
  const result4 = await wdaRequest<WDAElement>(
    "POST",
    `/session/${session.sessionId}/element`,
    {
      using: "-ios predicate string",
      value: `label == "${accessibilityId}"`,
    },
  );
  if (result4.success && result4.data) {
    return { success: true, data: result4.data };
  }

  return {
    success: false,
    error: `Element not found: ${accessibilityId}`,
  };
}

/**
 * Find multiple elements by accessibility identifier
 */
export async function findElementsByAccessibilityId(
  udid: string,
  accessibilityId: string,
): Promise<CommandResult<WDAElement[]>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session for this device" };
  }

  const result = await wdaRequest<WDAElement[]>(
    "POST",
    `/session/${session.sessionId}/elements`,
    {
      using: "accessibility id",
      value: accessibilityId,
    },
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data || [] };
}

/**
 * Find element by predicate string (more flexible)
 */
export async function findElementByPredicate(
  udid: string,
  predicate: string,
): Promise<CommandResult<WDAElement>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session for this device" };
  }

  const result = await wdaRequest<WDAElement>(
    "POST",
    `/session/${session.sessionId}/element`,
    {
      using: "-ios predicate string",
      value: predicate,
    },
  );

  if (!result.success || !result.data) {
    return { success: false, error: result.error || "Element not found" };
  }

  return { success: true, data: result.data };
}

/**
 * Find elements by class chain (for SwiftUI workaround)
 * Returns all elements of a given type
 */
export async function findElementsByClassChain(
  udid: string,
  classChain: string,
): Promise<CommandResult<WDAElement[]>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session for this device" };
  }

  const result = await wdaRequest<WDAElement[]>(
    "POST",
    `/session/${session.sessionId}/elements`,
    {
      using: "-ios class chain",
      value: classChain,
    },
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, data: result.data || [] };
}

/**
 * Find element by type (e.g., "TextField", "Button")
 * Useful for SwiftUI elements that don't expose accessibility identifiers
 */
export async function findElementByType(
  udid: string,
  elementType: string,
  index = 0,
): Promise<CommandResult<WDAElement>> {
  const result = await findElementsByClassChain(
    udid,
    `**/XCUIElementType${elementType}`,
  );

  if (!result.success || !result.data || result.data.length === 0) {
    return { success: false, error: `No ${elementType} elements found` };
  }

  if (index >= result.data.length) {
    return {
      success: false,
      error: `${elementType} index ${index} out of bounds (found ${result.data.length})`,
    };
  }

  return { success: true, data: result.data[index] };
}

/**
 * Find element by type and label text
 * More reliable than index-based search
 * @param labelMatch - Text to match in label (supports partial match)
 */
export async function findElementByTypeAndLabel(
  udid: string,
  elementType: string,
  labelMatch: string,
  index = 0,
): Promise<CommandResult<WDAElement>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session for this device" };
  }

  // Use iOS predicate string for more flexible matching
  // Match by label CONTAINS or name CONTAINS
  const predicate = `type == "XCUIElementType${elementType}" AND (label CONTAINS "${labelMatch}" OR name CONTAINS "${labelMatch}" OR value CONTAINS "${labelMatch}")`;

  const result = await wdaRequest<WDAElement[]>(
    "POST",
    `/session/${session.sessionId}/elements`,
    {
      using: "-ios predicate string",
      value: predicate,
    },
  );

  if (!result.success || !result.data || result.data.length === 0) {
    return { success: false, error: `No ${elementType} with label containing "${labelMatch}" found` };
  }

  if (index >= result.data.length) {
    return {
      success: false,
      error: `${elementType} with label "${labelMatch}" index ${index} out of bounds (found ${result.data.length})`,
    };
  }

  return { success: true, data: result.data[index] };
}

/**
 * Get element rect (position and size)
 */
export async function getElementRect(
  udid: string,
  element: WDAElement,
): Promise<CommandResult<{ x: number; y: number; width: number; height: number }>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session for this device" };
  }

  const elementId = element.ELEMENT || element["element-6066-11e4-a52e-4f735466cecf"];

  const result = await wdaRequest<{ x: number; y: number; width: number; height: number }>(
    "GET",
    `/session/${session.sessionId}/element/${elementId}/rect`,
  );

  if (!result.success || !result.data) {
    return { success: false, error: result.error || "Failed to get element rect" };
  }

  return { success: true, data: result.data };
}

/**
 * Get element information
 */
export async function getElementInfo(
  udid: string,
  element: WDAElement,
): Promise<CommandResult<WDAElementInfo>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session for this device" };
  }

  const elementId = element.ELEMENT || element["element-6066-11e4-a52e-4f735466cecf"];

  // Get multiple attributes
  const [typeResult, labelResult, nameResult, valueResult, rectResult, enabledResult, displayedResult] =
    await Promise.all([
      wdaRequest<string>("GET", `/session/${session.sessionId}/element/${elementId}/attribute/type`),
      wdaRequest<string>("GET", `/session/${session.sessionId}/element/${elementId}/attribute/label`),
      wdaRequest<string>("GET", `/session/${session.sessionId}/element/${elementId}/attribute/name`),
      wdaRequest<string>("GET", `/session/${session.sessionId}/element/${elementId}/attribute/value`),
      wdaRequest<{ x: number; y: number; width: number; height: number }>(
        "GET",
        `/session/${session.sessionId}/element/${elementId}/rect`,
      ),
      wdaRequest<boolean>("GET", `/session/${session.sessionId}/element/${elementId}/enabled`),
      wdaRequest<boolean>("GET", `/session/${session.sessionId}/element/${elementId}/displayed`),
    ]);

  return {
    success: true,
    data: {
      type: typeResult.data || "unknown",
      label: labelResult.data || null,
      name: nameResult.data || null,
      value: valueResult.data || null,
      rect: rectResult.data || { x: 0, y: 0, width: 0, height: 0 },
      enabled: enabledResult.data ?? true,
      displayed: displayedResult.data ?? true,
    },
  };
}

// ============================================
// Tap Operations
// ============================================

/**
 * Tap on an element by type and optional label match
 * Uses coordinate-based tap for SwiftUI compatibility
 * (See: https://github.com/appium/appium/issues/20759)
 *
 * @param elementType - Element type (TextField, Button, etc.)
 * @param elementIndex - Index when multiple elements match (default 0)
 * @param labelMatch - Optional label text to match (partial match supported)
 */
export async function tap(
  udid: string,
  elementType: string,
  elementIndex = 0,
  labelMatch?: string,
): Promise<TapResult> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, elementFound: false };
  }

  let elementResult: CommandResult<WDAElement>;

  // Use label matching if provided, otherwise fall back to type + index
  if (labelMatch) {
    console.log(`[WDA] Finding ${elementType} with label containing "${labelMatch}" (index: ${elementIndex})`);
    elementResult = await findElementByTypeAndLabel(udid, elementType, labelMatch, elementIndex);
  } else {
    console.log(`[WDA] Finding element by type "${elementType}" (index: ${elementIndex})`);
    elementResult = await findElementByType(udid, elementType, elementIndex);
  }

  if (!elementResult.success || !elementResult.data) {
    console.log(`[WDA] Element not found: ${elementResult.error}`);
    return { success: false, elementFound: false };
  }

  // Get element rect for coordinate tap
  const rectResult = await getElementRect(udid, elementResult.data);

  if (!rectResult.success || !rectResult.data) {
    console.log(`[WDA] Failed to get element rect`);
    return { success: false, elementFound: true };
  }

  const { x, y, width, height } = rectResult.data;
  const centerX = x + width / 2;
  const centerY = y + height / 2;

  console.log(`[WDA] Tapping at coordinates: (${centerX}, ${centerY})`);

  const tapResult = await tapCoordinate(udid, centerX, centerY);
  return {
    success: tapResult.success,
    elementFound: true,
  };
}

/**
 * Tap at specific coordinates
 */
export async function tapCoordinate(
  udid: string,
  x: number,
  y: number,
): Promise<TapResult> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, elementFound: false };
  }

  const result = await wdaRequest(
    "POST",
    `/session/${session.sessionId}/actions`,
    {
      actions: [
        {
          type: "pointer",
          id: "finger1",
          parameters: { pointerType: "touch" },
          actions: [
            { type: "pointerMove", duration: 0, x, y },
            { type: "pointerDown", button: 0 },
            { type: "pause", duration: 100 },
            { type: "pointerUp", button: 0 },
          ],
        },
      ],
    },
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
 * Type text into an element by type and optional label match
 * Uses tap then types into the focused element
 *
 * @param elementType - Element type (TextField, SecureTextField, etc.)
 * @param text - Text to type
 * @param elementIndex - Index when multiple elements match (default 0)
 * @param clearFirst - Clear existing text before typing (default true)
 * @param labelMatch - Optional label text to match (partial match supported)
 */
export async function typeText(
  udid: string,
  elementType: string,
  text: string,
  elementIndex = 0,
  clearFirst = true,
  labelMatch?: string,
): Promise<TextInputResult> {
  // First tap to focus the element
  const tapResult = await tap(udid, elementType, elementIndex, labelMatch);
  if (!tapResult.success) {
    return { success: false, textEntered: "" };
  }

  // Small delay to ensure element is focused
  await new Promise((resolve) => setTimeout(resolve, 300));

  const session = await getSession(udid);
  if (!session) {
    return { success: false, textEntered: "" };
  }

  // Get the active (focused) element
  const activeResult = await wdaRequest<WDAElement>(
    "GET",
    `/session/${session.sessionId}/element/active`,
  );

  if (!activeResult.success || !activeResult.data) {
    // Fallback: try to type without element reference
    console.log("[WDA] No active element found, trying keyboard input");
    const keyboardResult = await wdaRequest(
      "POST",
      `/session/${session.sessionId}/keys`,
      { value: text.split("") },
    );
    return {
      success: keyboardResult.success,
      textEntered: keyboardResult.success ? text : "",
    };
  }

  const elementId =
    activeResult.data.ELEMENT || activeResult.data["element-6066-11e4-a52e-4f735466cecf"];

  // Clear existing text if requested
  if (clearFirst) {
    await wdaRequest("POST", `/session/${session.sessionId}/element/${elementId}/clear`);
  }

  // Type the new text
  const result = await wdaRequest(
    "POST",
    `/session/${session.sessionId}/element/${elementId}/value`,
    { text },
  );

  return {
    success: result.success,
    textEntered: result.success ? text : "",
  };
}

/**
 * Type text into the currently focused element
 */
export async function typeTextFocused(udid: string, text: string): Promise<TextInputResult> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, textEntered: "" };
  }

  // Get the active element
  const activeResult = await wdaRequest<WDAElement>(
    "GET",
    `/session/${session.sessionId}/element/active`,
  );

  if (!activeResult.success || !activeResult.data) {
    return { success: false, textEntered: "" };
  }

  const elementId =
    activeResult.data.ELEMENT || activeResult.data["element-6066-11e4-a52e-4f735466cecf"];

  const result = await wdaRequest(
    "POST",
    `/session/${session.sessionId}/element/${elementId}/value`,
    { text },
  );

  return {
    success: result.success,
    textEntered: result.success ? text : "",
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
  duration = 500,
): Promise<SwipeResult> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, direction: "down" };
  }

  const result = await wdaRequest(
    "POST",
    `/session/${session.sessionId}/actions`,
    {
      actions: [
        {
          type: "pointer",
          id: "finger1",
          parameters: { pointerType: "touch" },
          actions: [
            { type: "pointerMove", duration: 0, x: startX, y: startY },
            { type: "pointerDown", button: 0 },
            { type: "pointerMove", duration, x: endX, y: endY },
            { type: "pointerUp", button: 0 },
          ],
        },
      ],
    },
  );

  // Determine direction
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
 * Scroll until an element becomes visible
 */
export async function scrollUntilVisible(
  udid: string,
  accessibilityId: string,
  direction: "up" | "down" = "down",
  maxScrolls = 10,
): Promise<{ found: boolean; scrollCount: number }> {
  const session = await getSession(udid);
  if (!session) {
    return { found: false, scrollCount: 0 };
  }

  // Get screen size
  const sizeResult = await wdaRequest<{ width: number; height: number }>(
    "GET",
    `/session/${session.sessionId}/window/current/size`,
  );

  const width = sizeResult.data?.width || 390;
  const height = sizeResult.data?.height || 844;

  const centerX = width / 2;
  const startY = direction === "down" ? height * 0.7 : height * 0.3;
  const endY = direction === "down" ? height * 0.3 : height * 0.7;

  for (let i = 0; i < maxScrolls; i++) {
    // Check if element exists
    const elementResult = await findElementByAccessibilityId(udid, accessibilityId, 1000);
    if (elementResult.success) {
      return { found: true, scrollCount: i };
    }

    // Scroll
    await swipe(udid, centerX, startY, centerX, endY, 300);

    // Wait for scroll animation
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return { found: false, scrollCount: maxScrolls };
}

// ============================================
// Element State Checks
// ============================================

/**
 * Check if an element exists
 */
export async function elementExists(
  udid: string,
  accessibilityId: string,
  timeout = 5000,
): Promise<boolean> {
  const result = await findElementByAccessibilityId(udid, accessibilityId, timeout);
  return result.success;
}

/**
 * Wait for an element to appear
 */
export async function waitForElement(
  udid: string,
  accessibilityId: string,
  timeout = 10000,
): Promise<CommandResult<WDAElement>> {
  return findElementByAccessibilityId(udid, accessibilityId, timeout);
}

/**
 * Get element text (label or value)
 */
export async function getElementText(
  udid: string,
  accessibilityId: string,
): Promise<string | undefined> {
  const elementResult = await findElementByAccessibilityId(udid, accessibilityId);
  if (!elementResult.success || !elementResult.data) {
    return undefined;
  }

  const session = await getSession(udid);
  if (!session) {
    return undefined;
  }

  const elementId =
    elementResult.data.ELEMENT || elementResult.data["element-6066-11e4-a52e-4f735466cecf"];

  const textResult = await wdaRequest<string>(
    "GET",
    `/session/${session.sessionId}/element/${elementId}/text`,
  );

  return textResult.data ?? undefined;
}

/**
 * Get element value (for text fields, switches, etc.)
 */
export async function getElementValue(
  udid: string,
  accessibilityId: string,
): Promise<string | undefined> {
  const elementResult = await findElementByAccessibilityId(udid, accessibilityId);
  if (!elementResult.success || !elementResult.data) {
    return undefined;
  }

  const session = await getSession(udid);
  if (!session) {
    return undefined;
  }

  const elementId =
    elementResult.data.ELEMENT || elementResult.data["element-6066-11e4-a52e-4f735466cecf"];

  const valueResult = await wdaRequest<string>(
    "GET",
    `/session/${session.sessionId}/element/${elementId}/attribute/value`,
  );

  return valueResult.data ?? undefined;
}

// ============================================
// Screenshot
// ============================================

/**
 * Take a screenshot
 */
export async function takeScreenshot(udid: string): Promise<CommandResult<string>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session for this device" };
  }

  const result = await wdaRequest<string>(
    "GET",
    `/session/${session.sessionId}/screenshot`,
  );

  if (!result.success || !result.data) {
    return { success: false, error: result.error || "Screenshot failed" };
  }

  // Returns base64 encoded PNG
  return { success: true, data: result.data };
}

// ============================================
// App Management
// ============================================

/**
 * Launch an app
 */
export async function launchApp(
  udid: string,
  bundleId: string,
): Promise<CommandResult<void>> {
  const session = await getSession(udid);
  if (!session) {
    // Create a new session which launches the app
    const sessionResult = await createSession(udid, bundleId);
    return {
      success: sessionResult.success,
      error: sessionResult.error,
    };
  }

  // If session exists but for different app, recreate
  if (session.bundleId !== bundleId) {
    await deleteSession(udid);
    const sessionResult = await createSession(udid, bundleId);
    return {
      success: sessionResult.success,
      error: sessionResult.error,
    };
  }

  // Activate the app
  const result = await wdaRequest(
    "POST",
    `/session/${session.sessionId}/appium/app/activate`,
    { bundleId },
  );

  return {
    success: result.success,
    error: result.error,
  };
}

/**
 * Terminate an app
 */
export async function terminateApp(
  udid: string,
  bundleId: string,
): Promise<CommandResult<void>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: true };
  }

  const result = await wdaRequest(
    "POST",
    `/session/${session.sessionId}/appium/app/terminate`,
    { bundleId },
  );

  return {
    success: result.success,
    error: result.error,
  };
}

// ============================================
// UI Hierarchy
// ============================================

/**
 * Get the page source (XML representation of UI hierarchy)
 */
export async function getPageSource(udid: string): Promise<CommandResult<string>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session for this device" };
  }

  const result = await wdaRequest<string>(
    "GET",
    `/session/${session.sessionId}/source`,
  );

  return {
    success: result.success,
    data: result.data,
    error: result.error,
  };
}

// ============================================
// Toggle Operations
// ============================================

/**
 * Toggle a switch element by type
 */
export async function toggleSwitch(
  udid: string,
  elementIndex = 0,
  targetState?: boolean,
): Promise<CommandResult<{ newState: boolean }>> {
  // Find switch element by type
  const elementResult = await findElementByType(udid, "Switch", elementIndex);
  if (!elementResult.success || !elementResult.data) {
    return { success: false, error: `Switch element not found at index ${elementIndex}` };
  }

  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session" };
  }

  const elementId =
    elementResult.data.ELEMENT || elementResult.data["element-6066-11e4-a52e-4f735466cecf"];

  // Get current value
  const valueResult = await wdaRequest<string>(
    "GET",
    `/session/${session.sessionId}/element/${elementId}/attribute/value`,
  );
  const currentState = valueResult.data === "1" || valueResult.data === "true";

  // If target state matches current, no action needed
  if (targetState !== undefined && targetState === currentState) {
    return { success: true, data: { newState: currentState } };
  }

  // Tap to toggle using coordinates
  const rectResult = await getElementRect(udid, elementResult.data);
  if (!rectResult.success || !rectResult.data) {
    return { success: false, error: "Failed to get switch position" };
  }

  const { x, y, width, height } = rectResult.data;
  const tapResult = await tapCoordinate(udid, x + width / 2, y + height / 2);
  if (!tapResult.success) {
    return { success: false, error: "Failed to tap toggle" };
  }

  // Get new value
  await new Promise((resolve) => setTimeout(resolve, 300));
  const newValueResult = await wdaRequest<string>(
    "GET",
    `/session/${session.sessionId}/element/${elementId}/attribute/value`,
  );
  const newState = newValueResult.data === "1" || newValueResult.data === "true";

  return { success: true, data: { newState } };
}

// ============================================
// Slider Operations
// ============================================

/**
 * Set slider value (0.0 - 1.0) by type
 */
export async function setSliderValue(
  udid: string,
  value: number,
  elementIndex = 0,
): Promise<CommandResult<void>> {
  if (value < 0 || value > 1) {
    return { success: false, error: "Slider value must be between 0 and 1" };
  }

  // Find slider element by type
  const elementResult = await findElementByType(udid, "Slider", elementIndex);
  if (!elementResult.success || !elementResult.data) {
    return { success: false, error: `Slider not found at index ${elementIndex}` };
  }

  // Get slider rect
  const rectResult = await getElementRect(udid, elementResult.data);
  if (!rectResult.success || !rectResult.data) {
    return { success: false, error: "Failed to get slider position" };
  }

  const rect = rectResult.data;
  const targetX = rect.x + rect.width * value;
  const centerY = rect.y + rect.height / 2;

  // Tap at target position
  const tapResult = await tapCoordinate(udid, targetX, centerY);

  return {
    success: tapResult.success,
    error: tapResult.success ? undefined : "Failed to set slider value",
  };
}

// ============================================
// Picker Operations
// ============================================

/**
 * Select a value in a picker
 */
export async function selectPickerValue(
  udid: string,
  accessibilityId: string,
  targetValue: string,
): Promise<CommandResult<void>> {
  const session = await getSession(udid);
  if (!session) {
    return { success: false, error: "No active session" };
  }

  // Find the picker
  const elementResult = await findElementByAccessibilityId(udid, accessibilityId);
  if (!elementResult.success || !elementResult.data) {
    return { success: false, error: "Picker not found" };
  }

  const elementId =
    elementResult.data.ELEMENT || elementResult.data["element-6066-11e4-a52e-4f735466cecf"];

  // Get picker rect
  const rectResult = await wdaRequest<{ x: number; y: number; width: number; height: number }>(
    "GET",
    `/session/${session.sessionId}/element/${elementId}/rect`,
  );

  if (!rectResult.success || !rectResult.data) {
    return { success: false, error: "Failed to get picker position" };
  }

  const rect = rectResult.data;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;

  // Try scrolling to find the value
  for (let i = 0; i < 20; i++) {
    // Check current value
    const valueResult = await wdaRequest<string>(
      "GET",
      `/session/${session.sessionId}/element/${elementId}/attribute/value`,
    );

    if (valueResult.data === targetValue) {
      return { success: true };
    }

    // Scroll up to change value
    await swipe(udid, centerX, centerY, centerX, centerY - 30, 200);
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return { success: false, error: "Could not find picker value" };
}

// ============================================
// Utility
// ============================================

/**
 * Check if Appium server is running
 */
export async function isAppiumRunning(): Promise<boolean> {
  try {
    const response = await fetch(`${APPIUM_BASE_URL}/status`);
    const result = await response.json();
    return result.value?.ready === true;
  } catch {
    return false;
  }
}

/**
 * Get all active sessions
 */
export function getActiveSessions(): Map<string, WDASession> {
  return new Map(activeSessions);
}
