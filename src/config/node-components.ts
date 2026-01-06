import { InitialNode } from "@/components/initial-node";
import { NodeType } from "@/generated/prisma/browser";
import type { NodeTypes } from "@xyflow/react";

// Trigger nodes
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger";
import { ScheduleTriggerNode } from "@/features/triggers/components/schedule-trigger";
import { IntervalTriggerNode } from "@/features/triggers/components/interval-trigger";

// Execution nodes
import { HttpRequestNode } from "@/features/executions/components/http-request";
import { OpenAiNode } from "@/features/executions/components/openai";
import { AnthropicNode } from "@/features/executions/components/anthropic";
import { GeminiNode } from "@/features/executions/components/gemini";
import { DiscordNode } from "@/features/executions/components/discord";
import { SlackNode } from "@/features/executions/components/slack";

// iOS Testing - Simulator Control
import { SimulatorBootNode } from "@/features/ios-testing/components/simulator-boot";
import { SimulatorShutdownNode } from "@/features/ios-testing/components/simulator-shutdown";
import { AppInstallNode } from "@/features/ios-testing/components/app-install";
import { AppUninstallNode } from "@/features/ios-testing/components/app-uninstall";
import { AppLaunchNode } from "@/features/ios-testing/components/app-launch";
import { AppTerminateNode } from "@/features/ios-testing/components/app-terminate";

// iOS Testing - UI Interaction
import { TapNode } from "@/features/ios-testing/components/tap";
import { TextInputNode } from "@/features/ios-testing/components/text-input";
import { SwipeNode } from "@/features/ios-testing/components/swipe";
import { ScrollUntilVisibleNode } from "@/features/ios-testing/components/scroll-until-visible";
import { PickerSelectNode } from "@/features/ios-testing/components/picker-select";
import { SliderSetNode } from "@/features/ios-testing/components/slider-set";
import { ToggleSwitchNode } from "@/features/ios-testing/components/toggle-switch";
import { ScreenshotNode } from "@/features/ios-testing/components/screenshot";
import { VideoRecordingNode } from "@/features/ios-testing/components/video-recording";
import { WaitNode } from "@/features/ios-testing/components/wait";

// iOS Testing - Expect/Validation
import { ExpectExistsNode } from "@/features/ios-testing/components/expect-exists";
import { ExpectTextNode } from "@/features/ios-testing/components/expect-text";
import { ExpectValueNode } from "@/features/ios-testing/components/expect-value";
import { ExpectVisualNode } from "@/features/ios-testing/components/expect-visual";

// iOS Testing - Analysis
import { UiScanNode } from "@/features/ios-testing/components/ui-scan";

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.SCHEDULE_TRIGGER]: ScheduleTriggerNode,
  [NodeType.INTERVAL_TRIGGER]: IntervalTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.OPENAI]: OpenAiNode,
  [NodeType.ANTHROPIC]: AnthropicNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
  // iOS Testing - Simulator Control
  [NodeType.IOS_SIMULATOR_BOOT]: SimulatorBootNode,
  [NodeType.IOS_SIMULATOR_SHUTDOWN]: SimulatorShutdownNode,
  [NodeType.IOS_APP_INSTALL]: AppInstallNode,
  [NodeType.IOS_APP_UNINSTALL]: AppUninstallNode,
  [NodeType.IOS_APP_LAUNCH]: AppLaunchNode,
  [NodeType.IOS_APP_TERMINATE]: AppTerminateNode,
  // iOS Testing - UI Interaction
  [NodeType.IOS_TAP]: TapNode,
  [NodeType.IOS_TEXT_INPUT]: TextInputNode,
  [NodeType.IOS_SWIPE]: SwipeNode,
  [NodeType.IOS_SCROLL_UNTIL_VISIBLE]: ScrollUntilVisibleNode,
  [NodeType.IOS_PICKER_SELECT]: PickerSelectNode,
  [NodeType.IOS_SLIDER_SET]: SliderSetNode,
  [NodeType.IOS_TOGGLE_SWITCH]: ToggleSwitchNode,
  [NodeType.IOS_SCREENSHOT]: ScreenshotNode,
  [NodeType.IOS_VIDEO_RECORDING]: VideoRecordingNode,
  [NodeType.IOS_WAIT]: WaitNode,
  // iOS Testing - Expect/Validation
  [NodeType.IOS_EXPECT_EXISTS]: ExpectExistsNode,
  [NodeType.IOS_EXPECT_TEXT]: ExpectTextNode,
  [NodeType.IOS_EXPECT_VALUE]: ExpectValueNode,
  [NodeType.IOS_EXPECT_VISUAL]: ExpectVisualNode,
  // iOS Testing - Analysis
  [NodeType.IOS_UI_SCAN]: UiScanNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
