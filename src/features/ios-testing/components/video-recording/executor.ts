import { NonRetriableError } from "inngest";
import fs from "fs/promises";
import path from "path";
import type { NodeExecutor } from "@/features/executions/types";
import { iosVideoRecordingChannel } from "@/inngest/channels/ios-testing";
import { executeCommand, executeCommandStream } from "@/lib/ios/utils";
import prisma from "@/lib/db";

type VideoRecordingData = {
  variableName?: string;
  filename?: string;
};

export const videoRecordingExecutor: NodeExecutor<VideoRecordingData> = async ({
  data,
  nodeId,
  projectId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosVideoRecordingChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("start-video-recording", async () => {
      if (!data.variableName) {
        throw new NonRetriableError("Video Recording: Variable name is required");
      }

      // Get the device ID from context (set by simulator-boot node)
      const simulatorContext = context.simulator as
        | { deviceId?: string }
        | undefined;
      const deviceId =
        simulatorContext?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "Video Recording: No device ID found in context. Ensure Simulator Boot node runs first.",
        );
      }

      // Determine output directory based on project
      let recordingsDir = "/tmp";
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
          select: { projectPath: true },
        });

        if (project?.projectPath) {
          // Get project directory (parent of .xcodeproj/.xcworkspace)
          const projectDir = path.dirname(project.projectPath);
          recordingsDir = path.join(projectDir, "recordings");

          // Create recordings directory if it doesn't exist
          try {
            await fs.mkdir(recordingsDir, { recursive: true });
          } catch {
            // Fallback to /tmp if cannot create directory
            recordingsDir = "/tmp";
          }
        }
      }

      // Determine output path
      const timestamp = Date.now();
      const filename = data.filename
        ? (data.filename.endsWith(".mov") ? data.filename : `${data.filename}.mov`)
        : `recording_${timestamp}.mov`;
      const outputPath = path.join(recordingsDir, filename);

      console.log("[Video Recording] Starting recording to:", outputPath);
      console.log("[Video Recording] Device:", deviceId);

      // Start recording in background (non-blocking)
      // The recording will be stopped when the workflow ends
      executeCommandStream(
        "xcrun",
        ["simctl", "io", deviceId, "recordVideo", outputPath],
        undefined,
        undefined,
      );

      // Wait a moment for recording to start
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify recording started by checking if process is running
      const checkResult = await executeCommand("pgrep -f 'simctl io.*recordVideo'");
      if (!checkResult.success || !checkResult.data?.trim()) {
        throw new NonRetriableError(
          "Video Recording: Failed to start recording process",
        );
      }

      console.log("[Video Recording] Recording started successfully");

      return {
        ...context,
        [data.variableName]: {
          success: true,
          path: outputPath,
          filename,
          deviceId,
          recording: true,
        },
        // Store recording info for auto-stop at workflow end
        __videoRecording: {
          path: outputPath,
          deviceId,
          variableName: data.variableName,
        },
      };
    });

    await publish(
      iosVideoRecordingChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    // Stop any recording that might have started
    await executeCommand("pkill -SIGINT -f 'simctl io.*recordVideo'");

    await publish(
      iosVideoRecordingChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};

/**
 * Stop any active video recording
 * Called at the end of workflow execution (success or failure)
 */
export async function stopVideoRecording(): Promise<{ stopped: boolean; path?: string }> {
  console.log("[Video Recording] Stopping any active recordings...");

  // Send SIGINT to stop recording gracefully
  const result = await executeCommand("pkill -SIGINT -f 'simctl io.*recordVideo'");

  if (result.success) {
    // Wait for file to be finalized
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log("[Video Recording] Recording stopped");
    return { stopped: true };
  }

  console.log("[Video Recording] No active recording found");
  return { stopped: false };
}
