import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosAppInstallChannel } from "@/inngest/channels/ios-testing";
import { executeCommand } from "@/lib/ios/utils";
import prisma from "@/lib/db";

type AppInstallData = {
  variableName?: string;
  deviceId?: string;
  scheme?: string;
};

export const appInstallExecutor: NodeExecutor<AppInstallData> = async ({
  data,
  nodeId,
  projectId,
  context,
  step,
  publish,
}) => {
  console.log("[App Install Executor] START - nodeId:", nodeId, "projectId:", projectId);
  console.log("[App Install Executor] data:", JSON.stringify(data));

  await publish(
    iosAppInstallChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("app-install", async () => {
      console.log("[App Install] Starting with data:", JSON.stringify(data));
      console.log("[App Install] projectId:", projectId);

      if (!data.deviceId) {
        throw new NonRetriableError("App Install: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("App Install: Variable name is required");
      }

      if (!projectId) {
        throw new NonRetriableError("App Install: Project is required");
      }

      // Get project settings
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { projectPath: true, name: true, bundleId: true },
      });

      console.log("[App Install] Project:", JSON.stringify(project));

      if (!project?.projectPath) {
        throw new NonRetriableError("App Install: Xcode project path is not configured in project settings");
      }

      // Determine if it's a workspace or project
      const isWorkspace = project.projectPath.endsWith(".xcworkspace");
      const projectFlag = isWorkspace ? "-workspace" : "-project";

      // Get scheme - use provided scheme or auto-detect
      let scheme = data.scheme;
      if (!scheme) {
        // Try to get first available scheme
        const listResult = await executeCommand(
          `xcodebuild ${projectFlag} "${project.projectPath}" -list 2>/dev/null | grep -A 100 "Schemes:" | grep -v "Schemes:" | head -1 | xargs`,
          30000,
        );
        if (listResult.success && listResult.data?.trim()) {
          scheme = listResult.data.trim();
        }
      }

      if (!scheme) {
        throw new NonRetriableError("App Install: Could not determine scheme. Please specify a scheme in node settings.");
      }

      console.log("[App Install] Building project:", project.projectPath);
      console.log("[App Install] Scheme:", scheme);
      console.log("[App Install] Target device:", data.deviceId);

      // Build using xcodebuild
      const derivedDataPath = `${process.env.HOME}/Library/Developer/Xcode/DerivedData`;
      const buildCommand = `xcodebuild ${projectFlag} "${project.projectPath}" -scheme "${scheme}" -destination "platform=iOS Simulator,id=${data.deviceId}" -derivedDataPath "${derivedDataPath}" build 2>&1`;

      console.log("[App Install] Running:", buildCommand);

      const buildResult = await executeCommand(buildCommand, 300000); // 5 minute timeout for build

      console.log("[App Install] Build exit code:", buildResult.exitCode);

      if (!buildResult.success) {
        // Extract relevant error message
        const errorLines = buildResult.error?.split("\n").filter(line =>
          line.includes("error:") || line.includes("Error:")
        ).slice(0, 5).join("\n");

        throw new NonRetriableError(
          `App Install (xcodebuild) failed:\n${errorLines || buildResult.error || "Unknown error"}`,
        );
      }

      console.log("[App Install] Build succeeded");

      // Find the built .app file
      const findAppCommand = `find "${derivedDataPath}" -name "${scheme}.app" -type d -path "*/Debug-iphonesimulator/*" 2>/dev/null | grep -v "Index.noindex" | head -1`;
      console.log("[App Install] Finding app:", findAppCommand);

      const findResult = await executeCommand(findAppCommand, 30000);
      const appPath = findResult.data?.trim();

      if (!appPath) {
        throw new NonRetriableError(
          "App Install: Could not find built .app file in DerivedData",
        );
      }

      console.log("[App Install] Found app at:", appPath);

      // Install the app on the simulator using simctl
      const installCommand = `xcrun simctl install "${data.deviceId}" "${appPath}"`;
      console.log("[App Install] Installing:", installCommand);

      const installResult = await executeCommand(installCommand, 60000);

      if (!installResult.success) {
        throw new NonRetriableError(
          `App Install (simctl install) failed: ${installResult.error || "Unknown error"}`,
        );
      }

      console.log("[App Install] Install succeeded");

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
      iosAppInstallChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosAppInstallChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
