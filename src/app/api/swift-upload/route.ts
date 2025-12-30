import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const execAsync = promisify(exec);

// Analysis result types matching Swift Package output
interface SourceLocation {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
}

interface UIComponentResult {
  id: string;
  type: string;
  label: string | null;
  hasAccessibilityId: boolean;
  existingAccessibilityId: string | null;
  sourceLocation: SourceLocation;
  parentView: string;
  suggestedId: string;
}

interface AnalysisResult {
  filePath: string;
  components: UIComponentResult[];
  componentsNeedingIds: UIComponentResult[];
  totalCount: number;
  withAccessibilityIdCount: number;
  timestamp: string;
}

interface InjectionResult {
  originalFilePath: string;
  modifiedSource: string;
  injectedCount: number;
  injectedIds: string[];
  timestamp: string;
}

// Temp directory for uploaded files
const TEMP_DIR = "/tmp/swift-analyzer";

// Path to swift-analyzer CLI (after building)
const SWIFT_ANALYZER_PATH = path.join(
  process.cwd(),
  "swift-analyzer/.build/release/swift-analyzer"
);

/**
 * POST /api/swift-upload
 * Upload and analyze a Swift source file
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const workflowId = formData.get("workflowId") as string | null;
    const mode = (formData.get("mode") as string) || "analyze";

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!workflowId) {
      return NextResponse.json(
        { error: "workflowId is required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith(".swift")) {
      return NextResponse.json(
        { error: "Only .swift files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    // Verify workflow ownership
    const workflow = await prisma.workflow.findFirst({
      where: {
        id: workflowId,
        userId: session.user.id,
      },
    });

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Create temp directory if not exists
    await mkdir(TEMP_DIR, { recursive: true });

    // Save file to temp location
    const fileId = randomUUID();
    const tempFilePath = path.join(TEMP_DIR, `${fileId}.swift`);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, fileBuffer);

    try {
      if (mode === "inject") {
        // Inject accessibility IDs
        const result = await injectAccessibilityIds(tempFilePath, file.name);

        return NextResponse.json({
          success: true,
          mode: "inject",
          result,
        });
      } else {
        // Analyze file
        const result = await analyzeSwiftFile(tempFilePath, file.name);

        // Save components to database
        await saveComponentsToDb(workflowId, result.components, file.name);

        return NextResponse.json({
          success: true,
          mode: "analyze",
          result,
        });
      }
    } finally {
      // Clean up temp file
      await unlink(tempFilePath).catch(() => {});
    }
  } catch (error) {
    console.error("Swift upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Analyze Swift file using swift-analyzer CLI
 */
async function analyzeSwiftFile(
  filePath: string,
  originalFileName: string
): Promise<AnalysisResult> {
  try {
    // Execute swift-analyzer analyze command
    const { stdout } = await execAsync(
      `"${SWIFT_ANALYZER_PATH}" analyze --input "${filePath}"`,
      { timeout: 30000 }
    );

    const result: AnalysisResult = JSON.parse(stdout);

    // Replace temp path with original filename
    result.filePath = originalFileName;

    return result;
  } catch (error) {
    // If CLI fails, fallback to basic regex parsing
    console.warn("swift-analyzer CLI failed, using fallback parser:", error);
    return fallbackAnalyze(filePath, originalFileName);
  }
}

/**
 * Inject accessibility IDs using swift-analyzer CLI
 */
async function injectAccessibilityIds(
  filePath: string,
  originalFileName: string
): Promise<InjectionResult> {
  try {
    // Execute swift-analyzer inject command
    const { stdout } = await execAsync(
      `"${SWIFT_ANALYZER_PATH}" inject --input "${filePath}" --json`,
      { timeout: 30000 }
    );

    const result: InjectionResult = JSON.parse(stdout);
    result.originalFilePath = originalFileName;

    return result;
  } catch (error) {
    console.warn("swift-analyzer inject failed:", error);
    throw new Error("Failed to inject accessibility IDs");
  }
}

/**
 * Fallback parser when CLI is not available
 * Uses regex patterns to detect SwiftUI components
 */
async function fallbackAnalyze(
  filePath: string,
  originalFileName: string
): Promise<AnalysisResult> {
  const { readFile } = await import("fs/promises");
  const source = await readFile(filePath, "utf-8");
  const lines = source.split("\n");

  const componentPatterns = [
    { pattern: /Button\s*\(\s*"([^"]+)"\s*\)/g, type: "Button" },
    { pattern: /TextField\s*\(\s*"([^"]+)"\s*,/g, type: "TextField" },
    { pattern: /SecureField\s*\(\s*"([^"]+)"\s*,/g, type: "SecureField" },
    { pattern: /Toggle\s*\(\s*"([^"]+)"\s*,/g, type: "Toggle" },
    { pattern: /Slider\s*\(/g, type: "Slider" },
    { pattern: /Picker\s*\(\s*"([^"]+)"\s*,/g, type: "Picker" },
    { pattern: /DatePicker\s*\(\s*"([^"]+)"\s*,/g, type: "DatePicker" },
    { pattern: /NavigationLink\s*\(\s*"([^"]+)"\s*\)/g, type: "NavigationLink" },
    { pattern: /Link\s*\(\s*"([^"]+)"\s*,/g, type: "Link" },
  ];

  // Extract view name
  const viewNameMatch = source.match(/struct\s+(\w+)\s*:\s*View/);
  const viewName = viewNameMatch?.[1] || "Unknown";

  const components: UIComponentResult[] = [];
  let componentCounter: Record<string, number> = {};

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    for (const { pattern, type } of componentPatterns) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      let match;

      while ((match = pattern.exec(line)) !== null) {
        const label = match[1] || null;
        const key = `${viewName}_${type}`;
        const count = componentCounter[key] || 0;
        componentCounter[key] = count + 1;

        const sanitizedLabel = label
          ?.replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9_]/g, "")
          .slice(0, 20);

        const suggestedId = sanitizedLabel
          ? `${viewName}_${type}_${sanitizedLabel}_${count}`
          : `${viewName}_${type}_${count}`;

        // Check if line has accessibilityIdentifier
        const hasAccessibilityId = line.includes(".accessibilityIdentifier");

        components.push({
          id: suggestedId,
          type,
          label,
          hasAccessibilityId,
          existingAccessibilityId: null,
          sourceLocation: {
            line: lineIndex + 1,
            column: match.index + 1,
            endLine: lineIndex + 1,
            endColumn: match.index + match[0].length + 1,
          },
          parentView: viewName,
          suggestedId,
        });
      }
    }
  }

  const componentsNeedingIds = components.filter((c) => !c.hasAccessibilityId);

  return {
    filePath: originalFileName,
    components,
    componentsNeedingIds,
    totalCount: components.length,
    withAccessibilityIdCount: components.length - componentsNeedingIds.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Save detected components to database
 */
async function saveComponentsToDb(
  workflowId: string,
  components: UIComponentResult[],
  sourceFilePath: string
): Promise<void> {
  // Delete existing components for this workflow/file
  await prisma.uIComponent.deleteMany({
    where: {
      workflowId,
      sourceFilePath,
    },
  });

  // Insert new components
  if (components.length > 0) {
    await prisma.uIComponent.createMany({
      data: components.map((comp) => ({
        workflowId,
        accessibilityId: comp.suggestedId,
        componentType: comp.type,
        label: comp.label,
        sourceFilePath,
        sourceLineNumber: comp.sourceLocation.line,
        positionX: null,
        positionY: null,
      })),
    });
  }
}
