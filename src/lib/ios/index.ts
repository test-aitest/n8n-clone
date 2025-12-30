/**
 * iOS Testing Library - Main Entry Point
 * Re-exports all iOS automation functionality
 */

// IDB UI automation (idb wrapper)
export * as idb from "./idb";
// Simulator control (simctl wrapper)
export * as simulator from "./simulator";
// Xcode project detection
export * as xcodeProject from "./xcode-project";
// Type definitions
export * from "./types";
// Utility functions
export * from "./utils";
