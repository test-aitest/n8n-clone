/**
 * Visual Regression Testing Library
 * Uses pixelmatch for image comparison
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

/**
 * Result of visual comparison
 */
export interface VisualComparisonResult {
  /** Whether the images match within threshold */
  passed: boolean;
  /** Percentage of pixels that differ (0-100) */
  diffPercent: number;
  /** Number of different pixels */
  diffPixelCount: number;
  /** Total pixel count */
  totalPixels: number;
  /** Diff image as PNG buffer (if generateDiff is true) */
  diffImage?: Buffer;
  /** Path to saved diff image (if saveDiff is true) */
  diffImagePath?: string;
  /** Dimensions of compared images */
  dimensions: {
    width: number;
    height: number;
  };
  /** Error message if comparison failed */
  error?: string;
}

/**
 * Options for visual comparison
 */
export interface CompareOptions {
  /** Threshold for pixel matching (0-1, default 0.1) */
  threshold?: number;
  /** Whether to generate diff image */
  generateDiff?: boolean;
  /** Whether to save diff image to disk */
  saveDiff?: boolean;
  /** Directory to save diff images */
  diffOutputDir?: string;
  /** Custom name for diff file */
  diffFileName?: string;
  /** Include anti-aliasing detection */
  includeAA?: boolean;
  /** Alpha channel comparison */
  alpha?: number;
  /** Diff mask color [R, G, B] */
  diffColor?: [number, number, number];
  /** Anti-aliased pixel color [R, G, B] */
  aaColor?: [number, number, number];
  /** Diff mask opacity (0-1) */
  diffColorAlt?: [number, number, number];
}

const DEFAULT_OPTIONS: Required<CompareOptions> = {
  threshold: 0.1,
  generateDiff: true,
  saveDiff: false,
  diffOutputDir: "/tmp/visual-diffs",
  diffFileName: "diff",
  includeAA: false,
  alpha: 0.1,
  diffColor: [255, 0, 0],
  aaColor: [255, 255, 0],
  diffColorAlt: [0, 255, 0],
};

/**
 * Compare two images and return the difference
 */
export async function compareImages(
  actualBuffer: Buffer,
  expectedBuffer: Buffer,
  options: CompareOptions = {},
): Promise<VisualComparisonResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Parse PNG images
    const actualPng = PNG.sync.read(actualBuffer);
    const expectedPng = PNG.sync.read(expectedBuffer);

    // Check dimensions match
    if (
      actualPng.width !== expectedPng.width ||
      actualPng.height !== expectedPng.height
    ) {
      return {
        passed: false,
        diffPercent: 100,
        diffPixelCount: actualPng.width * actualPng.height,
        totalPixels: actualPng.width * actualPng.height,
        dimensions: {
          width: actualPng.width,
          height: actualPng.height,
        },
        error: `Image dimensions don't match: actual (${actualPng.width}x${actualPng.height}) vs expected (${expectedPng.width}x${expectedPng.height})`,
      };
    }

    const { width, height } = actualPng;
    const totalPixels = width * height;

    // Create diff image buffer
    const diffPng = new PNG({ width, height });

    // Run pixelmatch comparison
    const diffPixelCount = pixelmatch(
      actualPng.data,
      expectedPng.data,
      diffPng.data,
      width,
      height,
      {
        threshold: opts.threshold,
        includeAA: opts.includeAA,
        alpha: opts.alpha,
        diffColor: opts.diffColor,
        aaColor: opts.aaColor,
        diffColorAlt: opts.diffColorAlt,
      },
    );

    const diffPercent = (diffPixelCount / totalPixels) * 100;
    const passed = diffPercent <= opts.threshold * 100;

    const result: VisualComparisonResult = {
      passed,
      diffPercent: Math.round(diffPercent * 100) / 100,
      diffPixelCount,
      totalPixels,
      dimensions: { width, height },
    };

    // Generate diff image if requested
    if (opts.generateDiff) {
      result.diffImage = PNG.sync.write(diffPng);

      // Save diff image if requested
      if (opts.saveDiff && result.diffImage) {
        await mkdir(opts.diffOutputDir, { recursive: true });
        const diffPath = path.join(
          opts.diffOutputDir,
          `${opts.diffFileName}_${Date.now()}.png`,
        );
        await writeFile(diffPath, result.diffImage);
        result.diffImagePath = diffPath;
      }
    }

    return result;
  } catch (error) {
    return {
      passed: false,
      diffPercent: 100,
      diffPixelCount: 0,
      totalPixels: 0,
      dimensions: { width: 0, height: 0 },
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Compare two image files
 */
export async function compareImageFiles(
  actualPath: string,
  expectedPath: string,
  options: CompareOptions = {},
): Promise<VisualComparisonResult> {
  try {
    const [actualBuffer, expectedBuffer] = await Promise.all([
      readFile(actualPath),
      readFile(expectedPath),
    ]);

    return compareImages(actualBuffer, expectedBuffer, options);
  } catch (error) {
    return {
      passed: false,
      diffPercent: 100,
      diffPixelCount: 0,
      totalPixels: 0,
      dimensions: { width: 0, height: 0 },
      error:
        error instanceof Error ? error.message : "Failed to read image files",
    };
  }
}

/**
 * Compare image with Golden Master from URL
 */
export async function compareWithGoldenMaster(
  actualBuffer: Buffer,
  goldenMasterUrl: string,
  options: CompareOptions = {},
): Promise<VisualComparisonResult> {
  try {
    // Fetch golden master image
    const response = await fetch(goldenMasterUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch golden master: ${response.statusText}`);
    }

    const expectedBuffer = Buffer.from(await response.arrayBuffer());
    return compareImages(actualBuffer, expectedBuffer, options);
  } catch (error) {
    return {
      passed: false,
      diffPercent: 100,
      diffPixelCount: 0,
      totalPixels: 0,
      dimensions: { width: 0, height: 0 },
      error:
        error instanceof Error
          ? error.message
          : "Failed to compare with golden master",
    };
  }
}

/**
 * Create a golden master from a screenshot
 */
export async function createGoldenMaster(
  screenshotBuffer: Buffer,
  outputDir: string,
  name: string,
): Promise<{ path: string; dimensions: { width: number; height: number } }> {
  await mkdir(outputDir, { recursive: true });

  const png = PNG.sync.read(screenshotBuffer);
  const outputPath = path.join(outputDir, `${name}.png`);

  await writeFile(outputPath, screenshotBuffer);

  return {
    path: outputPath,
    dimensions: {
      width: png.width,
      height: png.height,
    },
  };
}

/**
 * Generate visual regression report
 */
export interface VisualRegressionReport {
  testName: string;
  timestamp: string;
  results: Array<{
    name: string;
    result: VisualComparisonResult;
    actualImagePath?: string;
    expectedImagePath?: string;
  }>;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
}

export function generateReport(
  testName: string,
  results: Array<{
    name: string;
    result: VisualComparisonResult;
    actualImagePath?: string;
    expectedImagePath?: string;
  }>,
): VisualRegressionReport {
  const passed = results.filter((r) => r.result.passed).length;
  const failed = results.length - passed;

  return {
    testName,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      total: results.length,
      passed,
      failed,
      passRate: results.length > 0 ? (passed / results.length) * 100 : 0,
    },
  };
}

/**
 * Resize image buffer to match dimensions
 */
export async function resizeImage(
  imageBuffer: Buffer,
  targetWidth: number,
  targetHeight: number,
): Promise<Buffer> {
  const png = PNG.sync.read(imageBuffer);

  // If dimensions match, return original
  if (png.width === targetWidth && png.height === targetHeight) {
    return imageBuffer;
  }

  // Create new PNG with target dimensions
  const resized = new PNG({ width: targetWidth, height: targetHeight });

  // Simple nearest-neighbor scaling
  const scaleX = png.width / targetWidth;
  const scaleY = png.height / targetHeight;

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(x * scaleX);
      const srcY = Math.floor(y * scaleY);
      const srcIdx = (srcY * png.width + srcX) * 4;
      const dstIdx = (y * targetWidth + x) * 4;

      resized.data[dstIdx] = png.data[srcIdx];
      resized.data[dstIdx + 1] = png.data[srcIdx + 1];
      resized.data[dstIdx + 2] = png.data[srcIdx + 2];
      resized.data[dstIdx + 3] = png.data[srcIdx + 3];
    }
  }

  return PNG.sync.write(resized);
}
