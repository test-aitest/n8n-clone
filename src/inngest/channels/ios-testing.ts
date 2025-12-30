import { channel, topic } from "@inngest/realtime";

// ============================================
// iOS Testing Channels
// ============================================

// Simulator Control
export const IOS_SIMULATOR_BOOT_CHANNEL_NAME = "ios-simulator-boot";
export const iosSimulatorBootChannel = channel(IOS_SIMULATOR_BOOT_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_SIMULATOR_SHUTDOWN_CHANNEL_NAME = "ios-simulator-shutdown";
export const iosSimulatorShutdownChannel = channel(IOS_SIMULATOR_SHUTDOWN_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_APP_INSTALL_CHANNEL_NAME = "ios-app-install";
export const iosAppInstallChannel = channel(IOS_APP_INSTALL_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_APP_LAUNCH_CHANNEL_NAME = "ios-app-launch";
export const iosAppLaunchChannel = channel(IOS_APP_LAUNCH_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_APP_TERMINATE_CHANNEL_NAME = "ios-app-terminate";
export const iosAppTerminateChannel = channel(IOS_APP_TERMINATE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

// UI Interaction
export const IOS_TAP_CHANNEL_NAME = "ios-tap";
export const iosTapChannel = channel(IOS_TAP_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_TEXT_INPUT_CHANNEL_NAME = "ios-text-input";
export const iosTextInputChannel = channel(IOS_TEXT_INPUT_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_SWIPE_CHANNEL_NAME = "ios-swipe";
export const iosSwipeChannel = channel(IOS_SWIPE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_SCROLL_UNTIL_VISIBLE_CHANNEL_NAME = "ios-scroll-until-visible";
export const iosScrollUntilVisibleChannel = channel(IOS_SCROLL_UNTIL_VISIBLE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_PICKER_SELECT_CHANNEL_NAME = "ios-picker-select";
export const iosPickerSelectChannel = channel(IOS_PICKER_SELECT_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_SLIDER_SET_CHANNEL_NAME = "ios-slider-set";
export const iosSliderSetChannel = channel(IOS_SLIDER_SET_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_TOGGLE_SWITCH_CHANNEL_NAME = "ios-toggle-switch";
export const iosToggleSwitchChannel = channel(IOS_TOGGLE_SWITCH_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_SCREENSHOT_CHANNEL_NAME = "ios-screenshot";
export const iosScreenshotChannel = channel(IOS_SCREENSHOT_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_WAIT_CHANNEL_NAME = "ios-wait";
export const iosWaitChannel = channel(IOS_WAIT_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

// Expect/Validation
export const IOS_EXPECT_EXISTS_CHANNEL_NAME = "ios-expect-exists";
export const iosExpectExistsChannel = channel(IOS_EXPECT_EXISTS_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_EXPECT_TEXT_CHANNEL_NAME = "ios-expect-text";
export const iosExpectTextChannel = channel(IOS_EXPECT_TEXT_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_EXPECT_VALUE_CHANNEL_NAME = "ios-expect-value";
export const iosExpectValueChannel = channel(IOS_EXPECT_VALUE_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

export const IOS_EXPECT_VISUAL_CHANNEL_NAME = "ios-expect-visual";
export const iosExpectVisualChannel = channel(IOS_EXPECT_VISUAL_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);

// Analysis
export const IOS_UI_SCAN_CHANNEL_NAME = "ios-ui-scan";
export const iosUiScanChannel = channel(IOS_UI_SCAN_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
