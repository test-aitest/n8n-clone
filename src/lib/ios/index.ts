/**
 * iOS Testing Library - Main Entry Point
 * Re-exports all iOS automation functionality
 */

// WebDriverAgent UI automation (Appium) - full SwiftUI accessibilityIdentifier support
export * as wda from "./wda";
// Simulator control (simctl wrapper)
export * as simulator from "./simulator";
// Physical device control (devicectl wrapper - iOS 17+)
export * as device from "./device";
// Unified device controller (handles both simulators and physical devices)
export * as deviceController from "./device-controller";
// Xcode project detection
export * as xcodeProject from "./xcode-project";
// Type definitions
export * from "./types";
// Utility functions
export * from "./utils";
