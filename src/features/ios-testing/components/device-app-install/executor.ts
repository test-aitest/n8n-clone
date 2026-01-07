import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosDeviceAppInstallChannel } from "@/inngest/channels/ios-testing";
import * as device from "@/lib/ios/device";
import { executeCommand } from "@/lib/ios/utils";
import prisma from "@/lib/db";

type DeviceAppInstallData = {
  variableName?: string;
  deviceId?: string;
  scheme?: string;
};

export const deviceAppInstallExecutor: NodeExecutor<DeviceAppInstallData> = async ({
  data,
  nodeId,
  projectId,
  context,
  step,
  publish,
}) => {
  console.log("[Device App Install Executor] START - nodeId:", nodeId, "projectId:", projectId);
  console.log("[Device App Install Executor] data:", JSON.stringify(data));

  await publish(
    iosDeviceAppInstallChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("device-app-install", async () => {
      console.log("[Device App Install] Starting with data:", JSON.stringify(data));

      if (!data.deviceId) {
        throw new NonRetriableError("Device App Install: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("Device App Install: Variable name is required");
      }

      if (!projectId) {
        throw new NonRetriableError("Device App Install: Project is required");
      }

      // Verify this is a physical device
      const physicalDevice = await device.getPhysicalDevice(data.deviceId);
      if (!physicalDevice) {
        throw new NonRetriableError(
          "Device App Install: Device not found or not connected. Make sure the device is connected via USB or paired via WiFi."
        );
      }

      // Get project settings
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { projectPath: true, name: true, bundleId: true },
      });

      console.log("[Device App Install] Project:", JSON.stringify(project));

      if (!project?.projectPath) {
        throw new NonRetriableError("Device App Install: Xcode project path is not configured in project settings");
      }

      // Determine if it's a workspace or project
      const isWorkspace = project.projectPath.endsWith(".xcworkspace");
      const projectFlag = isWorkspace ? "-workspace" : "-project";

      // Get scheme - use provided scheme or auto-detect
      let scheme = data.scheme;
      if (!scheme) {
        const listResult = await executeCommand(
          `xcodebuild ${projectFlag} "${project.projectPath}" -list 2>/dev/null | grep -A 100 "Schemes:" | grep -v "Schemes:" | head -1 | xargs`,
          30000,
        );
        if (listResult.success && listResult.data?.trim()) {
          scheme = listResult.data.trim();
        }
      }

      if (!scheme) {
        throw new NonRetriableError("Device App Install: Could not determine scheme. Please specify a scheme in node settings.");
      }

      console.log("[Device App Install] Building project:", project.projectPath);
      console.log("[Device App Install] Scheme:", scheme);
      console.log("[Device App Install] Target physical device:", data.deviceId);

      // Build for physical device using xcodebuild
      // Note: Requires Apple Developer signing
      const derivedDataPath = `${process.env.HOME}/Library/Developer/Xcode/DerivedData`;
      const buildCommand = `xcodebuild ${projectFlag} "${project.projectPath}" -scheme "${scheme}" -destination "platform=iOS,id=${data.deviceId}" -derivedDataPath "${derivedDataPath}" build 2>&1`;

      console.log("[Device App Install] Running:", buildCommand);

      const buildResult = await executeCommand(buildCommand, 300000); // 5 minute timeout for build

      console.log("[Device App Install] Build exit code:", buildResult.exitCode);

      if (!buildResult.success) {
        const errorLines = buildResult.error?.split("\n").filter(line =>
          line.includes("error:") || line.includes("Error:")
        ).slice(0, 5).join("\n");

        throw new NonRetriableError(
          `Device App Install (xcodebuild) failed:\n${errorLines || buildResult.error || "Unknown error"}`,
        );
      }

      console.log("[Device App Install] Build succeeded");

      // Find the built .app file (for physical device, look in Debug-iphoneos)
      const findAppCommand = `find "${derivedDataPath}" -name "${scheme}.app" -type d -path "*/Debug-iphoneos/*" 2>/dev/null | grep -v "Index.noindex" | head -1`;
      console.log("[Device App Install] Finding app:", findAppCommand);

      const findResult = await executeCommand(findAppCommand, 30000);
      const appPath = findResult.data?.trim();

      if (!appPath) {
        throw new NonRetriableError(
          "Device App Install: Could not find built .app file in DerivedData",
        );
      }

      console.log("[Device App Install] Found app at:", appPath);

      // Install the app on the physical device using devicectl
      const installResult = await device.installApp(data.deviceId, appPath);

      if (!installResult.success) {
        throw new NonRetriableError(
          `Device App Install failed: ${installResult.error || "Unknown error"}`,
        );
      }

      console.log("[Device App Install] Install succeeded");

      return {
        ...context,
        [data.variableName]: {
          success: true,
          deviceId: data.deviceId,
          scheme,
          projectPath: project.projectPath,
          bundleId: project.bundleId,
          appPath,
        },
      };
    });

    await publish(
      iosDeviceAppInstallChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosDeviceAppInstallChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
