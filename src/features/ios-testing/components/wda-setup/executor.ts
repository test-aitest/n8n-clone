import { readFileSync, writeFileSync } from "fs";
import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosWdaSetupChannel } from "@/inngest/channels/ios-testing";
import * as device from "@/lib/ios/device";
import { executeCommand, sleep } from "@/lib/ios/utils";

/**
 * Stop any running WDA (xcodebuild test-without-building) processes
 * Called at the end of workflow execution (success or failure)
 */
export async function stopWdaProcess(): Promise<{ stopped: boolean }> {
  console.log("[WDA] Stopping any active WDA processes...");

  // Kill xcodebuild processes running WebDriverAgentRunner test
  const result = await executeCommand(
    "pkill -f 'xcodebuild.*WebDriverAgentRunner.*test-without-building'",
    5000
  );

  // Also kill any leftover xcodebuild test processes for WDA
  await executeCommand(
    "pkill -f 'xcodebuild.*-scheme WebDriverAgentRunner'",
    5000
  );

  if (result.success || result.exitCode === 0) {
    // Wait for process cleanup
    await sleep(1000);
    console.log("[WDA] WDA process stopped");
    return { stopped: true };
  }

  // Check if any WDA processes are still running
  const checkResult = await executeCommand(
    "pgrep -f 'xcodebuild.*WebDriverAgentRunner'",
    3000
  );

  if (!checkResult.success || !checkResult.data?.trim()) {
    console.log("[WDA] No active WDA process found");
    return { stopped: false };
  }

  // Force kill if still running
  await executeCommand(
    "pkill -9 -f 'xcodebuild.*WebDriverAgentRunner'",
    5000
  );
  console.log("[WDA] WDA process force killed");
  return { stopped: true };
}

type WdaSetupData = {
  variableName?: string;
  deviceId?: string;
  teamId?: string;
  signingId?: string;
};

// WDA project path (installed by Appium XCUITest driver)
const WDA_PROJECT_PATH =
  process.env.WDA_PROJECT_PATH ||
  `${process.env.HOME}/.appium/node_modules/appium-xcuitest-driver/node_modules/appium-webdriveragent/WebDriverAgent.xcodeproj`;

/**
 * Configure Xcode project for automatic signing and unique bundle ID
 * Modifies project.pbxproj to enable automatic code signing and set unique bundle identifiers
 */
async function configureXcodeProject(
  projectPath: string,
  teamId: string,
): Promise<{ success: boolean; error?: string }> {
  const pbxprojPath = `${projectPath}/project.pbxproj`;

  // Create a unique bundle ID prefix based on team ID
  const uniqueBundleIdPrefix = `com.${teamId.toLowerCase()}.wda`;

  try {
    console.log("[WDA Setup] Configuring Xcode project...");
    let content = readFileSync(pbxprojPath, "utf-8");

    // Check if already configured for this team with unique bundle ID
    if (
      content.includes(`DEVELOPMENT_TEAM = ${teamId}`) &&
      content.includes("CODE_SIGN_STYLE = Automatic") &&
      content.includes(uniqueBundleIdPrefix)
    ) {
      console.log("[WDA Setup] Project already configured");
      return { success: true };
    }

    // Backup original file (only if not already backed up)
    const backupPath = `${pbxprojPath}.original`;
    try {
      readFileSync(backupPath);
    } catch {
      writeFileSync(backupPath, content);
      console.log("[WDA Setup] Created backup at", backupPath);
    }

    // Replace or add CODE_SIGN_STYLE = Automatic
    content = content.replace(
      /CODE_SIGN_STYLE = [^;]*;/g,
      "CODE_SIGN_STYLE = Automatic;",
    );

    // Replace or add DEVELOPMENT_TEAM
    content = content.replace(
      /DEVELOPMENT_TEAM = [^;]*;/g,
      `DEVELOPMENT_TEAM = ${teamId};`,
    );

    // Change bundle identifiers to unique ones
    // WebDriverAgentLib: com.facebook.WebDriverAgentLib -> com.{teamId}.wda.lib
    content = content.replace(
      /PRODUCT_BUNDLE_IDENTIFIER = "?com\.facebook\.WebDriverAgentLib"?;/g,
      `PRODUCT_BUNDLE_IDENTIFIER = "${uniqueBundleIdPrefix}.lib";`,
    );

    // WebDriverAgentRunner: com.facebook.WebDriverAgentRunner.xctrunner -> com.{teamId}.wda.runner
    content = content.replace(
      /PRODUCT_BUNDLE_IDENTIFIER = "?com\.facebook\.WebDriverAgentRunner\.xctrunner"?;/g,
      `PRODUCT_BUNDLE_IDENTIFIER = "${uniqueBundleIdPrefix}.runner";`,
    );

    // Also handle the WebDriverAgentRunner (without .xctrunner)
    content = content.replace(
      /PRODUCT_BUNDLE_IDENTIFIER = "?com\.facebook\.WebDriverAgentRunner"?;/g,
      `PRODUCT_BUNDLE_IDENTIFIER = "${uniqueBundleIdPrefix}.runner";`,
    );

    // If CODE_SIGN_STYLE doesn't exist, add it
    if (!content.includes("CODE_SIGN_STYLE = Automatic")) {
      content = content.replace(
        /(buildSettings = \{[^}]*)(};)/g,
        (match, settingsStart, settingsEnd) => {
          if (!match.includes("CODE_SIGN_STYLE")) {
            return `${settingsStart}\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n\t\t\t${settingsEnd}`;
          }
          return match;
        },
      );
    }

    if (!content.includes(`DEVELOPMENT_TEAM = ${teamId}`)) {
      content = content.replace(
        /(buildSettings = \{[^}]*)(};)/g,
        (match, settingsStart, settingsEnd) => {
          if (!match.includes("DEVELOPMENT_TEAM")) {
            return `${settingsStart}\n\t\t\t\tDEVELOPMENT_TEAM = ${teamId};\n\t\t\t${settingsEnd}`;
          }
          return match;
        },
      );
    }

    // Clear any existing provisioning profile specifiers
    content = content.replace(
      /PROVISIONING_PROFILE_SPECIFIER = "[^"]*";/g,
      'PROVISIONING_PROFILE_SPECIFIER = "";',
    );
    content = content.replace(
      /PROVISIONING_PROFILE = "[^"]*";/g,
      'PROVISIONING_PROFILE = "";',
    );

    // Write modified content
    writeFileSync(pbxprojPath, content);

    console.log("[WDA Setup] Project configured with unique bundle ID:", uniqueBundleIdPrefix);
    return { success: true };
  } catch (error) {
    console.error("[WDA Setup] Failed to configure project:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const wdaSetupExecutor: NodeExecutor<WdaSetupData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  console.log("[WDA Setup Executor] START - nodeId:", nodeId);
  console.log("[WDA Setup Executor] data:", JSON.stringify(data));

  await publish(
    iosWdaSetupChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("wda-setup", async () => {
      console.log("[WDA Setup] Starting with data:", JSON.stringify(data));

      if (!data.deviceId) {
        throw new NonRetriableError("WDA Setup: Device ID is required");
      }

      if (!data.variableName) {
        throw new NonRetriableError("WDA Setup: Variable name is required");
      }

      if (!data.teamId) {
        throw new NonRetriableError("WDA Setup: Team ID is required");
      }

      const signingId = data.signingId || "Apple Development";

      // Step 1: Verify this is a physical device
      console.log("[WDA Setup] Step 1: Verifying physical device...");
      const physicalDevice = await device.getPhysicalDevice(data.deviceId);
      if (!physicalDevice) {
        throw new NonRetriableError(
          "WDA Setup: Device not found or not connected. Make sure the device is connected via USB and trusted.",
        );
      }
      console.log("[WDA Setup] Device found:", physicalDevice.name);

      // Step 2: Check if WDA project exists
      console.log("[WDA Setup] Step 2: Checking WDA project...");
      const checkResult = await executeCommand(`ls "${WDA_PROJECT_PATH}"`, 5000);
      if (!checkResult.success) {
        throw new NonRetriableError(
          `WDA Setup: WebDriverAgent project not found at ${WDA_PROJECT_PATH}. ` +
            "Please install Appium XCUITest driver: npx appium driver install xcuitest",
        );
      }
      console.log("[WDA Setup] WDA project found");

      // Step 3: Configure Xcode project (signing + unique bundle ID)
      console.log("[WDA Setup] Step 3: Configuring Xcode project...");
      const configResult = await configureXcodeProject(
        WDA_PROJECT_PATH,
        data.teamId,
      );
      if (!configResult.success) {
        throw new NonRetriableError(
          `WDA Setup: Failed to configure project.\n${configResult.error}`,
        );
      }

      // Step 4: Build WDA for the device
      console.log("[WDA Setup] Step 4: Building WebDriverAgent...");
      console.log("[WDA Setup] This may take 1-3 minutes...");

      const derivedDataPath = `/tmp/wda-build-${data.deviceId}`;
      const buildCommand = [
        "xcodebuild",
        `-project "${WDA_PROJECT_PATH}"`,
        "-scheme WebDriverAgentRunner",
        `-destination "id=${data.deviceId}"`,
        `-derivedDataPath "${derivedDataPath}"`,
        "-allowProvisioningUpdates",
        `-allowProvisioningDeviceRegistration`,
        `DEVELOPMENT_TEAM=${data.teamId}`,
        `CODE_SIGN_IDENTITY="${signingId}"`,
        "build-for-testing",
        "2>&1",
      ].join(" ");

      console.log("[WDA Setup] Running build command...");
      const buildResult = await executeCommand(buildCommand, 300000); // 5 minute timeout

      if (!buildResult.success) {
        const errorOutput = buildResult.error || buildResult.data || "";

        // Check for specific error types
        if (errorOutput.includes("No Account for Team")) {
          throw new NonRetriableError(
            `WDA Setup: Apple Developer account not configured in Xcode.\n\n` +
              `Required steps:\n` +
              `1. Open Xcode → Settings → Accounts\n` +
              `2. Click '+' and add your Apple ID (${data.teamId})\n` +
              `3. Make sure the team shows your Team ID: ${data.teamId}\n` +
              `4. Re-run this node after adding the account`,
          );
        }

        if (errorOutput.includes("No profiles for") || errorOutput.includes("provisioning profile")) {
          throw new NonRetriableError(
            `WDA Setup: Provisioning profile not found.\n\n` +
              `Required steps:\n` +
              `1. Open the WDA project in Xcode:\n` +
              `   open "${WDA_PROJECT_PATH}"\n` +
              `2. Select 'WebDriverAgentRunner' target\n` +
              `3. Go to 'Signing & Capabilities' tab\n` +
              `4. Enable 'Automatically manage signing'\n` +
              `5. Select your Team (${data.teamId})\n` +
              `6. Build once manually (Cmd+B)\n` +
              `7. Then re-run this node`,
          );
        }

        if (errorOutput.includes("No signing certificate")) {
          throw new NonRetriableError(
            `WDA Setup: Code signing certificate not found.\n\n` +
              `Required steps:\n` +
              `1. Open Xcode → Settings → Accounts\n` +
              `2. Select your Apple ID\n` +
              `3. Click 'Manage Certificates'\n` +
              `4. Click '+' and create 'Apple Development' certificate\n` +
              `5. Re-run this node`,
          );
        }

        // Extract relevant error lines for generic errors
        const errorLines =
          errorOutput
            .split("\n")
            .filter(
              (line) =>
                line.includes("error:") ||
                line.includes("Error:") ||
                line.includes("** BUILD FAILED **"),
            )
            .slice(0, 10)
            .join("\n") || errorOutput.substring(0, 500);

        throw new NonRetriableError(
          `WDA Setup: Build failed.\n${errorLines}\n\n` +
            "Common fixes:\n" +
            "1. Ensure your Apple Developer account is signed in to Xcode\n" +
            "2. Verify the Team ID is correct\n" +
            "3. Trust the device on both Mac and iPhone\n" +
            "4. Enable Developer Mode on iOS 16+ devices",
        );
      }

      console.log("[WDA Setup] Build succeeded!");

      // Step 5: Test that WDA can be launched
      console.log("[WDA Setup] Step 5: Testing WDA installation...");

      // Run test-without-building to verify WDA works
      const testCommand = [
        "xcodebuild",
        "-project",
        `"${WDA_PROJECT_PATH}"`,
        "-scheme",
        "WebDriverAgentRunner",
        "-destination",
        `"id=${data.deviceId}"`,
        "-derivedDataPath",
        `"${derivedDataPath}"`,
        `DEVELOPMENT_TEAM=${data.teamId}`,
        `CODE_SIGN_IDENTITY="${signingId}"`,
        "test-without-building",
        "2>&1",
      ].join(" ");

      // Start the test in background and wait a bit to see if it launches
      console.log("[WDA Setup] Starting WDA test launch...");
      // Run in background - we don't need to wait for completion
      void executeCommand(testCommand, 60000);

      // Wait for WDA to start (check for success indicators)
      await sleep(15000);

      // Check if WDA server is responding
      let wdaRunning = false;
      for (let i = 0; i < 5; i++) {
        try {
          const statusCheck = await executeCommand(
            "curl -s http://127.0.0.1:8100/status",
            5000,
          );
          if (statusCheck.success && statusCheck.data?.includes("sessionId")) {
            wdaRunning = true;
            break;
          }
        } catch {
          // Ignore errors, keep trying
        }
        await sleep(3000);
      }

      // The test process will keep running - we don't need to wait for it
      // Just verify WDA started successfully

      console.log("[WDA Setup] WDA running:", wdaRunning);

      return {
        ...context,
        [data.variableName]: {
          success: true,
          deviceId: data.deviceId,
          deviceName: physicalDevice.name,
          teamId: data.teamId,
          signingId,
          wdaRunning,
          derivedDataPath,
          message: wdaRunning
            ? "WDA setup completed successfully. UI automation is ready."
            : "WDA built successfully. It may need to be started manually.",
        },
      };
    });

    await publish(
      iosWdaSetupChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosWdaSetupChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
