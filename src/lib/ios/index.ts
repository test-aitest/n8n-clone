/**
 * iOS Testing Library - Main Entry Point
 * Re-exports all iOS automation functionality
 */

// WebDriverAgent UI automation (Appium) - full SwiftUI accessibilityIdentifier support
export * as wda from "./wda";
// Simulator control (simctl wrapper)
export * as simulator from "./simulator";
// Xcode project detection
export * as xcodeProject from "./xcode-project";
// Type definitions
export * from "./types";
// Utility functions
export * from "./utils";
