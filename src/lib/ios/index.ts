/**
 * iOS Testing Library - Main Entry Point
 * Re-exports all iOS automation functionality
 */

// Type definitions
export * from "./types";

// Utility functions
export * from "./utils";

// Simulator control (simctl wrapper)
export * as simulator from "./simulator";

// IDB UI automation (idb wrapper)
export * as idb from "./idb";
