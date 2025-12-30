/**
 * iOS Testing Library - Type Definitions
 * Types for iOS Simulator control and UI automation
 */

// ============================================
// Simulator Types
// ============================================

export interface Simulator {
  udid: string;
  name: string;
  state: SimulatorState;
  runtime: string;
  deviceType: string;
  isAvailable: boolean;
}

export type SimulatorState = "Shutdown" | "Booted" | "Booting" | "ShuttingDown";

export interface SimulatorListResult {
  devices: Record<string, SimulatorDevice[]>;
}

export interface SimulatorDevice {
  udid: string;
  name: string;
  state: string;
  isAvailable: boolean;
  deviceTypeIdentifier: string;
}

// ============================================
// UI Element Types
// ============================================

export interface UIElement {
  AXLabel?: string;
  AXIdentifier?: string;
  AXValue?: string;
  AXRole?: string;
  AXRoleDescription?: string;
  AXFrame?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  AXEnabled?: boolean;
  AXFocused?: boolean;
  AXChildren?: UIElement[];
}

export interface UIHierarchy {
  elements: UIElement[];
  timestamp: Date;
}

// ============================================
// SwiftUI Component Types (for mapping)
// ============================================

export type SwiftUIComponentType =
  | "Button"
  | "TextField"
  | "SecureField"
  | "Toggle"
  | "Picker"
  | "Slider"
  | "ScrollView"
  | "List"
  | "Text"
  | "Image"
  | "NavigationLink";

export type AXRole =
  | "AXButton"
  | "AXTextField"
  | "AXSecureTextField"
  | "AXSwitch"
  | "AXPickerWheel"
  | "AXSlider"
  | "AXScrollView"
  | "AXList"
  | "AXStaticText"
  | "AXImage"
  | "AXLink";

export const SWIFTUI_TO_AXROLE: Record<SwiftUIComponentType, AXRole> = {
  Button: "AXButton",
  TextField: "AXTextField",
  SecureField: "AXSecureTextField",
  Toggle: "AXSwitch",
  Picker: "AXPickerWheel",
  Slider: "AXSlider",
  ScrollView: "AXScrollView",
  List: "AXList",
  Text: "AXStaticText",
  Image: "AXImage",
  NavigationLink: "AXLink",
};

// ============================================
// Command Result Types
// ============================================

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

export interface TapResult {
  success: boolean;
  elementFound: boolean;
}

export interface TextInputResult {
  success: boolean;
  textEntered: string;
}

export interface SwipeResult {
  success: boolean;
  direction: SwipeDirection;
}

export type SwipeDirection = "up" | "down" | "left" | "right";

export interface ScreenshotResult {
  success: boolean;
  path: string;
  buffer?: Buffer;
}

// ============================================
// Expect/Assertion Types
// ============================================

export interface ExpectResult {
  passed: boolean;
  actual?: string;
  expected?: string;
  message?: string;
}

export interface VisualCompareResult {
  passed: boolean;
  diffPercent: number;
  diffImagePath?: string;
  threshold: number;
}

// ============================================
// Hardware Button Types
// ============================================

export type HardwareButton =
  | "HOME"
  | "LOCK"
  | "SIRI"
  | "VOLUME_UP"
  | "VOLUME_DOWN"
  | "APPLE_PAY";

// ============================================
// Node Configuration Types
// ============================================

export interface IOSSimulatorBootConfig {
  deviceId: string;
  timeout?: number;
}

export interface IOSAppInstallConfig {
  deviceId: string;
  appPath: string;
}

export interface IOSAppLaunchConfig {
  deviceId: string;
  bundleId: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface IOSTapConfig {
  deviceId: string;
  accessibilityId: string;
  timeout?: number;
}

export interface IOSTextInputConfig {
  deviceId: string;
  accessibilityId?: string;
  text: string;
}

export interface IOSSwipeConfig {
  deviceId: string;
  direction: SwipeDirection;
  startX?: number;
  startY?: number;
  distance?: number;
  duration?: number;
}

export interface IOSScrollUntilVisibleConfig {
  deviceId: string;
  accessibilityId: string;
  direction: "up" | "down";
  maxScrolls?: number;
  timeout?: number;
}

export interface IOSPickerSelectConfig {
  deviceId: string;
  accessibilityId: string;
  value: string;
}

export interface IOSSliderSetConfig {
  deviceId: string;
  accessibilityId: string;
  value: number; // 0.0 - 1.0
}

export interface IOSToggleSwitchConfig {
  deviceId: string;
  accessibilityId: string;
  targetState?: boolean; // true = ON, false = OFF, undefined = toggle
}

export interface IOSScreenshotConfig {
  deviceId: string;
  filename?: string;
  outputDir?: string;
}

export interface IOSWaitConfig {
  duration?: number; // milliseconds
  condition?: {
    accessibilityId: string;
    exists: boolean;
    timeout?: number;
  };
}

export interface IOSExpectExistsConfig {
  deviceId: string;
  accessibilityId: string;
  timeout?: number;
}

export interface IOSExpectTextConfig {
  deviceId: string;
  accessibilityId: string;
  expected: string;
  matchType?: "exact" | "contains" | "regex";
}

export interface IOSExpectValueConfig {
  deviceId: string;
  accessibilityId: string;
  expected: string;
}

export interface IOSExpectVisualConfig {
  deviceId: string;
  baselineImage: string;
  threshold?: number; // 0.0 - 1.0, default 0.1
}

export interface IOSUIScanConfig {
  deviceId: string;
  outputFormat?: "json" | "tree";
}

// ============================================
// Node Output Types
// ============================================

export interface IOSNodeOutput {
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface IOSSimulatorBootOutput extends IOSNodeOutput {
  deviceId: string;
  state: SimulatorState;
}

export interface IOSAppLaunchOutput extends IOSNodeOutput {
  bundleId: string;
  pid?: number;
}

export interface IOSTapOutput extends IOSNodeOutput {
  accessibilityId: string;
  elementFound: boolean;
}

export interface IOSTextInputOutput extends IOSNodeOutput {
  text: string;
}

export interface IOSScreenshotOutput extends IOSNodeOutput {
  screenshotUrl: string;
  width?: number;
  height?: number;
}

export interface IOSExpectOutput extends IOSNodeOutput {
  passed: boolean;
  actual?: string;
  expected?: string;
}

export interface IOSUIScanOutput extends IOSNodeOutput {
  uiHierarchy: UIHierarchy;
  componentCount: number;
}
