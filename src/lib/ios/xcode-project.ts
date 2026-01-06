/**
 * iOS Testing Library - Xcode Project Detection
 * Utilities for detecting and extracting information from Xcode projects
 */

import { readdir, readFile, stat } from "fs/promises";
import path from "path";
import { executeCommand } from "./utils";

// ============================================
// Types
// ============================================

export interface XcodeProjectInfo {
  projectPath: string;
  projectName: string;
  bundleId: string | null;
  schemes: string[];
  targets: string[];
  swiftFiles: string[];
  hasSwiftUI: boolean;
}

export interface XcodeProjectDetection {
  type: "xcodeproj" | "xcworkspace" | "spm" | null;
  path: string | null;
  name: string | null;
}

export interface BuildSettings {
  bundleId: string | null;
  productName: string | null;
  targetName: string | null;
}

// ============================================
// Project Detection
// ============================================

/**
 * Detect Xcode project in a directory
 */
export async function detectXcodeProject(
  directoryPath: string,
): Promise<XcodeProjectDetection> {
  try {
    const files = await readdir(directoryPath);

    // Priority: .xcworkspace > .xcodeproj > Package.swift
    const workspace = files.find((f) => f.endsWith(".xcworkspace"));
    if (workspace) {
      return {
        type: "xcworkspace",
        path: path.join(directoryPath, workspace),
        name: workspace.replace(".xcworkspace", ""),
      };
    }

    const xcodeproj = files.find((f) => f.endsWith(".xcodeproj"));
    if (xcodeproj) {
      return {
        type: "xcodeproj",
        path: path.join(directoryPath, xcodeproj),
        name: xcodeproj.replace(".xcodeproj", ""),
      };
    }

    if (files.includes("Package.swift")) {
      return {
        type: "spm",
        path: path.join(directoryPath, "Package.swift"),
        name: path.basename(directoryPath),
      };
    }

    return { type: null, path: null, name: null };
  } catch (error) {
    console.error("Error detecting Xcode project:", error);
    return { type: null, path: null, name: null };
  }
}

/**
 * Get full project information
 */
export async function getProjectInfo(
  projectPath: string,
): Promise<XcodeProjectInfo> {
  const detection = await detectXcodeProject(path.dirname(projectPath));
  const projectDir = path.dirname(projectPath);

  // Get schemes and targets
  const { schemes, targets } = await getProjectSchemesAndTargets(projectPath);

  // Extract Bundle ID
  const bundleId = await extractBundleId(projectPath);

  // Find Swift files
  const swiftFiles = await findSwiftFiles(projectDir);

  // Check for SwiftUI usage
  const hasSwiftUI = await checkForSwiftUI(swiftFiles);

  return {
    projectPath,
    projectName: detection.name || path.basename(projectPath),
    bundleId,
    schemes,
    targets,
    swiftFiles,
    hasSwiftUI,
  };
}

// ============================================
// Bundle ID Extraction
// ============================================

/**
 * Extract Bundle ID from project
 */
export async function extractBundleId(
  projectPath: string,
): Promise<string | null> {
  // Try multiple methods to extract Bundle ID

  // Method 1: xcodebuild -showBuildSettings
  const buildSettingsBundleId = await getBundleIdFromBuildSettings(projectPath);
  if (buildSettingsBundleId) {
    return buildSettingsBundleId;
  }

  // Method 2: Parse Info.plist
  const projectDir = path.dirname(projectPath);
  const infoPlistBundleId = await getBundleIdFromInfoPlist(projectDir);
  if (infoPlistBundleId) {
    return infoPlistBundleId;
  }

  // Method 3: Parse project.pbxproj
  const pbxprojBundleId = await getBundleIdFromPbxproj(projectPath);
  if (pbxprojBundleId) {
    return pbxprojBundleId;
  }

  return null;
}

/**
 * Get Bundle ID from xcodebuild -showBuildSettings
 */
async function getBundleIdFromBuildSettings(
  projectPath: string,
): Promise<string | null> {
  const isWorkspace = projectPath.endsWith(".xcworkspace");
  const projectFlag = isWorkspace ? "-workspace" : "-project";

  const result = await executeCommand(
    `xcodebuild ${projectFlag} "${projectPath}" -showBuildSettings 2>/dev/null | grep PRODUCT_BUNDLE_IDENTIFIER | head -1 | awk '{print $3}'`,
    60000,
  );

  if (result.success && result.data && result.data.trim()) {
    const bundleId = result.data.trim();
    // Filter out variable references like $(PRODUCT_BUNDLE_IDENTIFIER:identifier)
    if (!bundleId.includes("$") && bundleId.includes(".")) {
      return bundleId;
    }
  }

  return null;
}

/**
 * Get Bundle ID from Info.plist file
 */
async function getBundleIdFromInfoPlist(
  projectDir: string,
): Promise<string | null> {
  try {
    // Find Info.plist files
    const result = await executeCommand(
      `find "${projectDir}" -name "Info.plist" -type f 2>/dev/null | head -5`,
    );

    if (!result.success || !result.data) {
      return null;
    }

    const infoPlistPaths = result.data.split("\n").filter(Boolean);

    for (const plistPath of infoPlistPaths) {
      // Skip Pods and build directories
      if (plistPath.includes("Pods/") || plistPath.includes("Build/")) {
        continue;
      }

      const plistResult = await executeCommand(
        `/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "${plistPath}" 2>/dev/null`,
      );

      if (plistResult.success && plistResult.data) {
        const bundleId = plistResult.data.trim();
        if (!bundleId.includes("$") && bundleId.includes(".")) {
          return bundleId;
        }
      }
    }
  } catch {
    // Ignore errors
  }

  return null;
}

/**
 * Get Bundle ID from project.pbxproj
 */
async function getBundleIdFromPbxproj(
  projectPath: string,
): Promise<string | null> {
  try {
    const pbxprojPath = projectPath.endsWith(".xcodeproj")
      ? path.join(projectPath, "project.pbxproj")
      : projectPath;

    const content = await readFile(pbxprojPath, "utf-8");

    // Find PRODUCT_BUNDLE_IDENTIFIER
    const bundleIdMatch = content.match(
      /PRODUCT_BUNDLE_IDENTIFIER\s*=\s*"?([^";]+)"?;/,
    );

    if (bundleIdMatch && bundleIdMatch[1]) {
      const bundleId = bundleIdMatch[1].trim();
      if (!bundleId.includes("$") && bundleId.includes(".")) {
        return bundleId;
      }
    }
  } catch {
    // Ignore errors
  }

  return null;
}

// ============================================
// Schemes and Targets
// ============================================

/**
 * Get project schemes and targets using xcodebuild
 */
async function getProjectSchemesAndTargets(
  projectPath: string,
): Promise<{ schemes: string[]; targets: string[] }> {
  const isWorkspace = projectPath.endsWith(".xcworkspace");
  const projectFlag = isWorkspace ? "-workspace" : "-project";

  const result = await executeCommand(
    `xcodebuild ${projectFlag} "${projectPath}" -list 2>/dev/null`,
    30000,
  );

  const schemes: string[] = [];
  const targets: string[] = [];

  if (!result.success || !result.data) {
    return { schemes, targets };
  }

  const lines = result.data.split("\n");
  let currentSection: "schemes" | "targets" | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "Schemes:") {
      currentSection = "schemes";
      continue;
    }

    if (trimmed === "Targets:") {
      currentSection = "targets";
      continue;
    }

    if (trimmed === "" || trimmed.includes(":")) {
      currentSection = null;
      continue;
    }

    if (currentSection === "schemes" && trimmed) {
      schemes.push(trimmed);
    }

    if (currentSection === "targets" && trimmed) {
      targets.push(trimmed);
    }
  }

  return { schemes, targets };
}

// ============================================
// Swift File Detection
// ============================================

/**
 * Find all Swift files in a directory (excluding Pods, Build, etc.)
 */
export async function findSwiftFiles(directoryPath: string): Promise<string[]> {
  const result = await executeCommand(
    `find "${directoryPath}" -name "*.swift" -type f \\
      ! -path "*/Pods/*" \\
      ! -path "*/.build/*" \\
      ! -path "*/Build/*" \\
      ! -path "*/DerivedData/*" \\
      ! -path "*/.git/*" \\
      2>/dev/null`,
    30000,
  );

  if (!result.success || !result.data) {
    return [];
  }

  return result.data.split("\n").filter(Boolean);
}

/**
 * Find SwiftUI files specifically
 */
export async function findSwiftUIFiles(
  directoryPath: string,
): Promise<string[]> {
  const result = await executeCommand(
    `grep -rl "import SwiftUI" "${directoryPath}" --include="*.swift" \\
      --exclude-dir="Pods" \\
      --exclude-dir=".build" \\
      --exclude-dir="Build" \\
      --exclude-dir="DerivedData" \\
      2>/dev/null`,
    30000,
  );

  if (!result.success || !result.data) {
    return [];
  }

  return result.data.split("\n").filter(Boolean);
}

/**
 * Check if project uses SwiftUI
 */
async function checkForSwiftUI(swiftFiles: string[]): Promise<boolean> {
  for (const filePath of swiftFiles.slice(0, 50)) {
    // Check first 50 files
    try {
      const content = await readFile(filePath, "utf-8");
      if (content.includes("import SwiftUI")) {
        return true;
      }
    } catch {
      // Ignore read errors
    }
  }
  return false;
}

// ============================================
// Built App Detection
// ============================================

/**
 * Find built .app file in DerivedData
 * Excludes Index.noindex paths and prefers simulator builds
 */
export async function findBuiltApp(
  projectPath: string,
): Promise<string | null> {
  // Get project name
  const detection = await detectXcodeProject(path.dirname(projectPath));
  const projectName = detection.name;

  if (!projectName) {
    return null;
  }

  // Search in DerivedData, excluding Index.noindex
  const derivedDataPath = path.join(
    process.env.HOME || "",
    "Library/Developer/Xcode/DerivedData",
  );

  const result = await executeCommand(
    `find "${derivedDataPath}" -name "${projectName}.app" -type d 2>/dev/null | grep -v "Index.noindex"`,
    30000,
  );

  if (result.success && result.data) {
    const appPaths = result.data.trim().split("\n").filter(Boolean);

    // Prefer simulator builds (Debug-iphonesimulator) over device builds
    const simulatorApp = appPaths.find(p => p.includes("iphonesimulator"));
    if (simulatorApp) {
      try {
        await stat(simulatorApp);
        return simulatorApp;
      } catch {
        // App doesn't exist
      }
    }

    // Fall back to first valid app path
    for (const appPath of appPaths) {
      try {
        await stat(appPath);
        return appPath;
      } catch {
        // Try next
      }
    }
  }

  // Also search for any .app in Build/Products (excluding Index.noindex)
  const projectDir = path.dirname(projectPath);
  const buildResult = await executeCommand(
    `find "${projectDir}" -name "*.app" -type d -path "*/Build/Products/*" 2>/dev/null | grep -v "Index.noindex"`,
    30000,
  );

  if (buildResult.success && buildResult.data) {
    const paths = buildResult.data.trim().split("\n").filter(Boolean);
    // Prefer simulator builds
    const simulatorPath = paths.find(p => p.includes("iphonesimulator"));
    return simulatorPath || paths[0] || null;
  }

  return null;
}

// ============================================
// Project Validation
// ============================================

/**
 * Validate that a path points to a valid Xcode project
 */
export async function validateXcodeProject(
  projectPath: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const stats = await stat(projectPath);

    if (projectPath.endsWith(".xcworkspace")) {
      if (!stats.isDirectory()) {
        return { valid: false, error: "Invalid workspace path" };
      }
      const contentsPath = path.join(projectPath, "contents.xcworkspacedata");
      try {
        await stat(contentsPath);
        return { valid: true };
      } catch {
        return { valid: false, error: "Invalid workspace structure" };
      }
    }

    if (projectPath.endsWith(".xcodeproj")) {
      if (!stats.isDirectory()) {
        return { valid: false, error: "Invalid project path" };
      }
      const pbxprojPath = path.join(projectPath, "project.pbxproj");
      try {
        await stat(pbxprojPath);
        return { valid: true };
      } catch {
        return { valid: false, error: "Invalid project structure" };
      }
    }

    if (projectPath.endsWith("Package.swift")) {
      if (!stats.isFile()) {
        return { valid: false, error: "Invalid Package.swift path" };
      }
      return { valid: true };
    }

    return { valid: false, error: "Unknown project type" };
  } catch {
    return { valid: false, error: "Path does not exist" };
  }
}

/**
 * Get project directory from project path
 */
export function getProjectDirectory(projectPath: string): string {
  if (
    projectPath.endsWith(".xcworkspace") ||
    projectPath.endsWith(".xcodeproj")
  ) {
    return path.dirname(projectPath);
  }
  if (projectPath.endsWith("Package.swift")) {
    return path.dirname(projectPath);
  }
  return projectPath;
}

// ============================================
// Accessibility Identifier Extraction
// ============================================

export interface ExtractedUIComponent {
  accessibilityId: string;
  componentType: string;
  sourceFilePath: string;
  sourceLineNumber: number;
  label?: string;
}

/**
 * Extract accessibilityIdentifier values from Swift files
 */
export async function extractAccessibilityIdentifiers(
  swiftFiles: string[],
): Promise<ExtractedUIComponent[]> {
  const components: ExtractedUIComponent[] = [];

  for (const filePath of swiftFiles) {
    try {
      const content = await readFile(filePath, "utf-8");
      const lines = content.split("\n");

      // Match patterns like .accessibilityIdentifier("identifier")
      const accessibilityPattern =
        /\.accessibilityIdentifier\s*\(\s*["']([^"']+)["']\s*\)/g;

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        let match;

        while ((match = accessibilityPattern.exec(line)) !== null) {
          const accessibilityId = match[1];

          // Try to determine component type from context
          const componentType = detectComponentType(lines, lineIndex);

          // Try to extract label from nearby code
          const label = extractLabel(lines, lineIndex);

          components.push({
            accessibilityId,
            componentType,
            sourceFilePath: filePath,
            sourceLineNumber: lineIndex + 1,
            label,
          });
        }

        // Reset lastIndex for next line
        accessibilityPattern.lastIndex = 0;
      }
    } catch {
      // Ignore read errors for individual files
    }
  }

  return components;
}

/**
 * Detect SwiftUI component type from surrounding code
 */
function detectComponentType(lines: string[], currentLine: number): string {
  // Look back up to 10 lines to find component type
  const searchStart = Math.max(0, currentLine - 10);
  const contextLines = lines.slice(searchStart, currentLine + 1).join("\n");

  // Component detection patterns (order matters - more specific first)
  const componentPatterns: { pattern: RegExp; type: string }[] = [
    { pattern: /SecureField\s*\(/i, type: "SecureField" },
    { pattern: /TextField\s*\(/i, type: "TextField" },
    { pattern: /TextEditor\s*\(/i, type: "TextEditor" },
    { pattern: /Button\s*\{/i, type: "Button" },
    { pattern: /Button\s*\(/i, type: "Button" },
    { pattern: /Toggle\s*\(/i, type: "Toggle" },
    { pattern: /Slider\s*\(/i, type: "Slider" },
    { pattern: /Picker\s*\(/i, type: "Picker" },
    { pattern: /Stepper\s*\(/i, type: "Stepper" },
    { pattern: /DatePicker\s*\(/i, type: "DatePicker" },
    { pattern: /ColorPicker\s*\(/i, type: "ColorPicker" },
    { pattern: /NavigationLink\s*\(/i, type: "NavigationLink" },
    { pattern: /Link\s*\(/i, type: "Link" },
    { pattern: /Menu\s*\(/i, type: "Menu" },
    { pattern: /List\s*\{/i, type: "List" },
    { pattern: /ScrollView\s*\{/i, type: "ScrollView" },
    { pattern: /LazyVStack/i, type: "LazyVStack" },
    { pattern: /LazyHStack/i, type: "LazyHStack" },
    { pattern: /VStack\s*\{/i, type: "VStack" },
    { pattern: /HStack\s*\{/i, type: "HStack" },
    { pattern: /ZStack\s*\{/i, type: "ZStack" },
    { pattern: /Image\s*\(/i, type: "Image" },
    { pattern: /Text\s*\(/i, type: "Text" },
    { pattern: /Label\s*\(/i, type: "Label" },
  ];

  for (const { pattern, type } of componentPatterns) {
    if (pattern.test(contextLines)) {
      return type;
    }
  }

  return "Unknown";
}

/**
 * Extract label from nearby code (placeholder text, button label, etc.)
 */
function extractLabel(lines: string[], currentLine: number): string | undefined {
  const searchStart = Math.max(0, currentLine - 5);
  const searchEnd = Math.min(lines.length, currentLine + 1);
  const contextLines = lines.slice(searchStart, searchEnd).join("\n");

  // Try to find text in quotes that might be a label
  // Look for patterns like Text("Label"), Button("Label"), TextField("placeholder", ...)
  const labelPatterns = [
    /Text\s*\(\s*["']([^"']+)["']\s*\)/,
    /Button\s*\(\s*["']([^"']+)["']/,
    /TextField\s*\(\s*["']([^"']+)["']/,
    /SecureField\s*\(\s*["']([^"']+)["']/,
    /Label\s*\(\s*["']([^"']+)["']/,
  ];

  for (const pattern of labelPatterns) {
    const match = contextLines.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return undefined;
}
