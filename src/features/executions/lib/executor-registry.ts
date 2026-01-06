import { NodeType } from "@/generated/prisma/client";
import { NodeExecutor } from "../types";
import { manualTriggerExecutor } from "@/features/triggers/components/manual-trigger/executor";
import { scheduleTriggerExecutor } from "@/features/triggers/components/schedule-trigger/executor";
import { intervalTriggerExecutor } from "@/features/triggers/components/interval-trigger/executor";
import { httpRequestExecutor } from "../components/http-request/executor";
import { geminiExecutor } from "../components/gemini/executor";
import { openAiExecutor } from "../components/openai/executor";
import { anthropicExecutor } from "../components/anthropic/executor";
import { discordExecutor } from "../components/discord/executor";
import { slackExecutor } from "../components/slack/executor";

// iOS Testing - Simulator Control
import { simulatorBootExecutor } from "@/features/ios-testing/components/simulator-boot/executor";
import { simulatorShutdownExecutor } from "@/features/ios-testing/components/simulator-shutdown/executor";
import { appInstallExecutor } from "@/features/ios-testing/components/app-install/executor";
import { appUninstallExecutor } from "@/features/ios-testing/components/app-uninstall/executor";
import { appLaunchExecutor } from "@/features/ios-testing/components/app-launch/executor";
import { appTerminateExecutor } from "@/features/ios-testing/components/app-terminate/executor";

// iOS Testing - UI Interaction
import { tapExecutor } from "@/features/ios-testing/components/tap/executor";
import { textInputExecutor } from "@/features/ios-testing/components/text-input/executor";
import { swipeExecutor } from "@/features/ios-testing/components/swipe/executor";
import { scrollUntilVisibleExecutor } from "@/features/ios-testing/components/scroll-until-visible/executor";
import { pickerSelectExecutor } from "@/features/ios-testing/components/picker-select/executor";
import { sliderSetExecutor } from "@/features/ios-testing/components/slider-set/executor";
import { toggleSwitchExecutor } from "@/features/ios-testing/components/toggle-switch/executor";
import { screenshotExecutor } from "@/features/ios-testing/components/screenshot/executor";
import { waitExecutor } from "@/features/ios-testing/components/wait/executor";

// iOS Testing - Expect/Validation
import { expectExistsExecutor } from "@/features/ios-testing/components/expect-exists/executor";
import { expectTextExecutor } from "@/features/ios-testing/components/expect-text/executor";
import { expectValueExecutor } from "@/features/ios-testing/components/expect-value/executor";
import { expectVisualExecutor } from "@/features/ios-testing/components/expect-visual/executor";

// iOS Testing - Analysis
import { uiScanExecutor } from "@/features/ios-testing/components/ui-scan/executor";

export const executorRegistry: Record<NodeType, NodeExecutor> = {
  [NodeType.INITIAL]: manualTriggerExecutor,
  [NodeType.MANUAL_TRIGGER]: manualTriggerExecutor,
  [NodeType.SCHEDULE_TRIGGER]: scheduleTriggerExecutor,
  [NodeType.INTERVAL_TRIGGER]: intervalTriggerExecutor,
  [NodeType.HTTP_REQUEST]: httpRequestExecutor,
  [NodeType.GEMINI]: geminiExecutor,
  [NodeType.ANTHROPIC]: anthropicExecutor,
  [NodeType.OPENAI]: openAiExecutor,
  [NodeType.DISCORD]: discordExecutor,
  [NodeType.SLACK]: slackExecutor,
  // iOS Testing - Simulator Control
  [NodeType.IOS_SIMULATOR_BOOT]: simulatorBootExecutor,
  [NodeType.IOS_SIMULATOR_SHUTDOWN]: simulatorShutdownExecutor,
  [NodeType.IOS_APP_INSTALL]: appInstallExecutor,
  [NodeType.IOS_APP_UNINSTALL]: appUninstallExecutor,
  [NodeType.IOS_APP_LAUNCH]: appLaunchExecutor,
  [NodeType.IOS_APP_TERMINATE]: appTerminateExecutor,
  // iOS Testing - UI Interaction
  [NodeType.IOS_TAP]: tapExecutor,
  [NodeType.IOS_TEXT_INPUT]: textInputExecutor,
  [NodeType.IOS_SWIPE]: swipeExecutor,
  [NodeType.IOS_SCROLL_UNTIL_VISIBLE]: scrollUntilVisibleExecutor,
  [NodeType.IOS_PICKER_SELECT]: pickerSelectExecutor,
  [NodeType.IOS_SLIDER_SET]: sliderSetExecutor,
  [NodeType.IOS_TOGGLE_SWITCH]: toggleSwitchExecutor,
  [NodeType.IOS_SCREENSHOT]: screenshotExecutor,
  [NodeType.IOS_WAIT]: waitExecutor,
  // iOS Testing - Expect/Validation
  [NodeType.IOS_EXPECT_EXISTS]: expectExistsExecutor,
  [NodeType.IOS_EXPECT_TEXT]: expectTextExecutor,
  [NodeType.IOS_EXPECT_VALUE]: expectValueExecutor,
  [NodeType.IOS_EXPECT_VISUAL]: expectVisualExecutor,
  // iOS Testing - Analysis
  [NodeType.IOS_UI_SCAN]: uiScanExecutor,
};

export const getExecutor = (type: NodeType): NodeExecutor => {
  const executor = executorRegistry[type];
  if (!executor) {
    throw new Error(`No executor found for node type: ${type}`);
  }

  return executor;
};
