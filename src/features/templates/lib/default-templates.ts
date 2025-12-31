/**
 * Default Workflow Templates
 * Pre-defined test flow templates for common iOS testing scenarios
 */

import { NodeType } from "@/generated/prisma/client";

export interface TemplateNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface TemplateDefinition {
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

export interface DefaultTemplate {
  id: string;
  name: string;
  description: string;
  category: "default";
  tags: string[];
  definition: TemplateDefinition;
  defaultVariables: Record<string, string>;
  includesSimulatorConfig: boolean;
}

// Node spacing for horizontal layout
const NODE_SPACING_X = 250;
const NODE_Y = 200;

// Helper to create unique IDs
let nodeCounter = 0;
function createNodeId(prefix: string): string {
  return `${prefix}_${++nodeCounter}`;
}

// Reset counter for each template
function resetNodeCounter(): void {
  nodeCounter = 0;
}

/**
 * Template 1: Button Tap → Screen Navigation Test
 */
const buttonTapNavigationTemplate: DefaultTemplate = (() => {
  resetNodeCounter();
  const triggerId = createNodeId("trigger");
  const bootId = createNodeId("boot");
  const launchId = createNodeId("launch");
  const tapId = createNodeId("tap");
  const expectId = createNodeId("expect");
  const screenshotId = createNodeId("screenshot");

  return {
    id: "default-button-tap-navigation",
    name: "ボタンタップ → 画面遷移テスト",
    description:
      "ボタンをタップして画面が正しく遷移することを検証します。シミュレータ起動→アプリ起動→ボタンタップ→遷移先画面の存在確認→スクリーンショット",
    category: "default",
    tags: ["button", "navigation", "tap", "screen"],
    includesSimulatorConfig: true,
    defaultVariables: {
      deviceId: "",
      bundleId: "",
      buttonId: "",
      targetScreenId: "",
    },
    definition: {
      nodes: [
        {
          id: triggerId,
          type: NodeType.MANUAL_TRIGGER,
          position: { x: 0, y: NODE_Y },
          data: {
            variableName: "trigger",
          },
        },
        {
          id: bootId,
          type: NodeType.IOS_SIMULATOR_BOOT,
          position: { x: NODE_SPACING_X, y: NODE_Y },
          data: {
            variableName: "simulatorBoot",
            deviceId: "{{deviceId}}",
          },
        },
        {
          id: launchId,
          type: NodeType.IOS_APP_LAUNCH,
          position: { x: NODE_SPACING_X * 2, y: NODE_Y },
          data: {
            variableName: "appLaunch",
            deviceId: "{{deviceId}}",
            bundleId: "{{bundleId}}",
          },
        },
        {
          id: tapId,
          type: NodeType.IOS_TAP,
          position: { x: NODE_SPACING_X * 3, y: NODE_Y },
          data: {
            variableName: "buttonTap",
            accessibilityId: "{{buttonId}}",
            timeout: "10000",
          },
        },
        {
          id: expectId,
          type: NodeType.IOS_EXPECT_EXISTS,
          position: { x: NODE_SPACING_X * 4, y: NODE_Y },
          data: {
            variableName: "screenExists",
            accessibilityId: "{{targetScreenId}}",
            timeout: "10000",
          },
        },
        {
          id: screenshotId,
          type: NodeType.IOS_SCREENSHOT,
          position: { x: NODE_SPACING_X * 5, y: NODE_Y },
          data: {
            variableName: "screenshot",
            filename: "navigation_result",
          },
        },
      ],
      edges: [
        { id: "e1", source: triggerId, target: bootId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e2", source: bootId, target: launchId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e3", source: launchId, target: tapId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e4", source: tapId, target: expectId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e5", source: expectId, target: screenshotId, sourceHandle: "source-1", targetHandle: "target-1" },
      ],
    },
  };
})();

/**
 * Template 2: Text Input → Action Test
 */
const textInputActionTemplate: DefaultTemplate = (() => {
  resetNodeCounter();
  const triggerId = createNodeId("trigger");
  const bootId = createNodeId("boot");
  const launchId = createNodeId("launch");
  const tapFieldId = createNodeId("tapField");
  const inputId = createNodeId("input");
  const tapSubmitId = createNodeId("tapSubmit");
  const expectId = createNodeId("expect");

  return {
    id: "default-text-input-action",
    name: "テキスト入力 → アクション確認テスト",
    description:
      "テキストフィールドに入力後、送信ボタンをタップし、期待するアクションが発生することを検証します。",
    category: "default",
    tags: ["text", "input", "action", "form"],
    includesSimulatorConfig: true,
    defaultVariables: {
      deviceId: "",
      bundleId: "",
      textFieldId: "",
      inputText: "test input",
      submitButtonId: "",
      resultId: "",
    },
    definition: {
      nodes: [
        {
          id: triggerId,
          type: NodeType.MANUAL_TRIGGER,
          position: { x: 0, y: NODE_Y },
          data: {
            variableName: "trigger",
          },
        },
        {
          id: bootId,
          type: NodeType.IOS_SIMULATOR_BOOT,
          position: { x: NODE_SPACING_X, y: NODE_Y },
          data: {
            variableName: "simulatorBoot",
            deviceId: "{{deviceId}}",
          },
        },
        {
          id: launchId,
          type: NodeType.IOS_APP_LAUNCH,
          position: { x: NODE_SPACING_X * 2, y: NODE_Y },
          data: {
            variableName: "appLaunch",
            deviceId: "{{deviceId}}",
            bundleId: "{{bundleId}}",
          },
        },
        {
          id: tapFieldId,
          type: NodeType.IOS_TAP,
          position: { x: NODE_SPACING_X * 3, y: NODE_Y },
          data: {
            variableName: "fieldTap",
            accessibilityId: "{{textFieldId}}",
          },
        },
        {
          id: inputId,
          type: NodeType.IOS_TEXT_INPUT,
          position: { x: NODE_SPACING_X * 4, y: NODE_Y },
          data: {
            variableName: "textInput",
            accessibilityId: "{{textFieldId}}",
            text: "{{inputText}}",
          },
        },
        {
          id: tapSubmitId,
          type: NodeType.IOS_TAP,
          position: { x: NODE_SPACING_X * 5, y: NODE_Y },
          data: {
            variableName: "submitTap",
            accessibilityId: "{{submitButtonId}}",
          },
        },
        {
          id: expectId,
          type: NodeType.IOS_EXPECT_EXISTS,
          position: { x: NODE_SPACING_X * 6, y: NODE_Y },
          data: {
            variableName: "resultExists",
            accessibilityId: "{{resultId}}",
            timeout: "10000",
          },
        },
      ],
      edges: [
        { id: "e1", source: triggerId, target: bootId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e2", source: bootId, target: launchId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e3", source: launchId, target: tapFieldId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e4", source: tapFieldId, target: inputId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e5", source: inputId, target: tapSubmitId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e6", source: tapSubmitId, target: expectId, sourceHandle: "source-1", targetHandle: "target-1" },
      ],
    },
  };
})();

/**
 * Template 3: Login Flow Test
 */
const loginFlowTemplate: DefaultTemplate = (() => {
  resetNodeCounter();
  const triggerId = createNodeId("trigger");
  const bootId = createNodeId("boot");
  const launchId = createNodeId("launch");
  const tapEmailId = createNodeId("tapEmail");
  const inputEmailId = createNodeId("inputEmail");
  const tapPasswordId = createNodeId("tapPassword");
  const inputPasswordId = createNodeId("inputPassword");
  const tapLoginId = createNodeId("tapLogin");
  const expectHomeId = createNodeId("expectHome");
  const screenshotId = createNodeId("screenshot");

  return {
    id: "default-login-flow",
    name: "ログインフローテスト",
    description:
      "メール/パスワード入力 → ログインボタン → ホーム画面への遷移を検証します。",
    category: "default",
    tags: ["login", "auth", "flow", "form"],
    includesSimulatorConfig: true,
    defaultVariables: {
      deviceId: "",
      bundleId: "",
      emailFieldId: "emailTextField",
      passwordFieldId: "passwordTextField",
      loginButtonId: "loginButton",
      homeScreenId: "homeScreen",
      testEmail: "test@example.com",
      testPassword: "password123",
    },
    definition: {
      nodes: [
        {
          id: triggerId,
          type: NodeType.MANUAL_TRIGGER,
          position: { x: 0, y: NODE_Y },
          data: {
            variableName: "trigger",
          },
        },
        {
          id: bootId,
          type: NodeType.IOS_SIMULATOR_BOOT,
          position: { x: NODE_SPACING_X, y: NODE_Y },
          data: {
            variableName: "simulatorBoot",
            deviceId: "{{deviceId}}",
          },
        },
        {
          id: launchId,
          type: NodeType.IOS_APP_LAUNCH,
          position: { x: NODE_SPACING_X * 2, y: NODE_Y },
          data: {
            variableName: "appLaunch",
            deviceId: "{{deviceId}}",
            bundleId: "{{bundleId}}",
          },
        },
        {
          id: tapEmailId,
          type: NodeType.IOS_TAP,
          position: { x: NODE_SPACING_X * 3, y: NODE_Y },
          data: {
            variableName: "emailFieldTap",
            accessibilityId: "{{emailFieldId}}",
          },
        },
        {
          id: inputEmailId,
          type: NodeType.IOS_TEXT_INPUT,
          position: { x: NODE_SPACING_X * 4, y: NODE_Y },
          data: {
            variableName: "emailInput",
            accessibilityId: "{{emailFieldId}}",
            text: "{{testEmail}}",
          },
        },
        {
          id: tapPasswordId,
          type: NodeType.IOS_TAP,
          position: { x: NODE_SPACING_X * 5, y: NODE_Y },
          data: {
            variableName: "passwordFieldTap",
            accessibilityId: "{{passwordFieldId}}",
          },
        },
        {
          id: inputPasswordId,
          type: NodeType.IOS_TEXT_INPUT,
          position: { x: NODE_SPACING_X * 6, y: NODE_Y },
          data: {
            variableName: "passwordInput",
            accessibilityId: "{{passwordFieldId}}",
            text: "{{testPassword}}",
          },
        },
        {
          id: tapLoginId,
          type: NodeType.IOS_TAP,
          position: { x: NODE_SPACING_X * 7, y: NODE_Y },
          data: {
            variableName: "loginButtonTap",
            accessibilityId: "{{loginButtonId}}",
          },
        },
        {
          id: expectHomeId,
          type: NodeType.IOS_EXPECT_EXISTS,
          position: { x: NODE_SPACING_X * 8, y: NODE_Y },
          data: {
            variableName: "homeScreenExists",
            accessibilityId: "{{homeScreenId}}",
            timeout: "15000",
          },
        },
        {
          id: screenshotId,
          type: NodeType.IOS_SCREENSHOT,
          position: { x: NODE_SPACING_X * 9, y: NODE_Y },
          data: {
            variableName: "screenshot",
            filename: "login_success",
          },
        },
      ],
      edges: [
        { id: "e1", source: triggerId, target: bootId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e2", source: bootId, target: launchId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e3", source: launchId, target: tapEmailId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e4", source: tapEmailId, target: inputEmailId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e5", source: inputEmailId, target: tapPasswordId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e6", source: tapPasswordId, target: inputPasswordId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e7", source: inputPasswordId, target: tapLoginId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e8", source: tapLoginId, target: expectHomeId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e9", source: expectHomeId, target: screenshotId, sourceHandle: "source-1", targetHandle: "target-1" },
      ],
    },
  };
})();

/**
 * Template 4: Form Validation Test
 */
const formValidationTemplate: DefaultTemplate = (() => {
  resetNodeCounter();
  const triggerId = createNodeId("trigger");
  const bootId = createNodeId("boot");
  const launchId = createNodeId("launch");
  const tapFieldId = createNodeId("tapField");
  const inputInvalidId = createNodeId("inputInvalid");
  const tapSubmitId = createNodeId("tapSubmit");
  const expectErrorId = createNodeId("expectError");
  const screenshotId = createNodeId("screenshot");

  return {
    id: "default-form-validation",
    name: "フォームバリデーションテスト",
    description:
      "不正な入力でエラーメッセージが表示されることを検証します。",
    category: "default",
    tags: ["form", "validation", "error", "input"],
    includesSimulatorConfig: true,
    defaultVariables: {
      deviceId: "",
      bundleId: "",
      inputFieldId: "",
      invalidInput: "invalid",
      submitButtonId: "",
      errorMessageId: "",
    },
    definition: {
      nodes: [
        {
          id: triggerId,
          type: NodeType.MANUAL_TRIGGER,
          position: { x: 0, y: NODE_Y },
          data: {
            variableName: "trigger",
          },
        },
        {
          id: bootId,
          type: NodeType.IOS_SIMULATOR_BOOT,
          position: { x: NODE_SPACING_X, y: NODE_Y },
          data: {
            variableName: "simulatorBoot",
            deviceId: "{{deviceId}}",
          },
        },
        {
          id: launchId,
          type: NodeType.IOS_APP_LAUNCH,
          position: { x: NODE_SPACING_X * 2, y: NODE_Y },
          data: {
            variableName: "appLaunch",
            deviceId: "{{deviceId}}",
            bundleId: "{{bundleId}}",
          },
        },
        {
          id: tapFieldId,
          type: NodeType.IOS_TAP,
          position: { x: NODE_SPACING_X * 3, y: NODE_Y },
          data: {
            variableName: "fieldTap",
            accessibilityId: "{{inputFieldId}}",
          },
        },
        {
          id: inputInvalidId,
          type: NodeType.IOS_TEXT_INPUT,
          position: { x: NODE_SPACING_X * 4, y: NODE_Y },
          data: {
            variableName: "invalidInput",
            accessibilityId: "{{inputFieldId}}",
            text: "{{invalidInput}}",
          },
        },
        {
          id: tapSubmitId,
          type: NodeType.IOS_TAP,
          position: { x: NODE_SPACING_X * 5, y: NODE_Y },
          data: {
            variableName: "submitTap",
            accessibilityId: "{{submitButtonId}}",
          },
        },
        {
          id: expectErrorId,
          type: NodeType.IOS_EXPECT_EXISTS,
          position: { x: NODE_SPACING_X * 6, y: NODE_Y },
          data: {
            variableName: "errorExists",
            accessibilityId: "{{errorMessageId}}",
            timeout: "5000",
          },
        },
        {
          id: screenshotId,
          type: NodeType.IOS_SCREENSHOT,
          position: { x: NODE_SPACING_X * 7, y: NODE_Y },
          data: {
            variableName: "screenshot",
            filename: "validation_error",
          },
        },
      ],
      edges: [
        { id: "e1", source: triggerId, target: bootId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e2", source: bootId, target: launchId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e3", source: launchId, target: tapFieldId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e4", source: tapFieldId, target: inputInvalidId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e5", source: inputInvalidId, target: tapSubmitId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e6", source: tapSubmitId, target: expectErrorId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e7", source: expectErrorId, target: screenshotId, sourceHandle: "source-1", targetHandle: "target-1" },
      ],
    },
  };
})();

/**
 * Template 5: List Scroll → Item Tap Test
 */
const listScrollTapTemplate: DefaultTemplate = (() => {
  resetNodeCounter();
  const triggerId = createNodeId("trigger");
  const bootId = createNodeId("boot");
  const launchId = createNodeId("launch");
  const scrollId = createNodeId("scroll");
  const tapItemId = createNodeId("tapItem");
  const expectDetailId = createNodeId("expectDetail");
  const screenshotId = createNodeId("screenshot");

  return {
    id: "default-list-scroll-tap",
    name: "リストスクロール → 要素タップテスト",
    description:
      "リストをスクロールして特定要素を見つけ、タップして詳細画面に遷移することを検証します。",
    category: "default",
    tags: ["list", "scroll", "tap", "navigation"],
    includesSimulatorConfig: true,
    defaultVariables: {
      deviceId: "",
      bundleId: "",
      targetItemId: "",
      detailScreenId: "",
    },
    definition: {
      nodes: [
        {
          id: triggerId,
          type: NodeType.MANUAL_TRIGGER,
          position: { x: 0, y: NODE_Y },
          data: {
            variableName: "trigger",
          },
        },
        {
          id: bootId,
          type: NodeType.IOS_SIMULATOR_BOOT,
          position: { x: NODE_SPACING_X, y: NODE_Y },
          data: {
            variableName: "simulatorBoot",
            deviceId: "{{deviceId}}",
          },
        },
        {
          id: launchId,
          type: NodeType.IOS_APP_LAUNCH,
          position: { x: NODE_SPACING_X * 2, y: NODE_Y },
          data: {
            variableName: "appLaunch",
            deviceId: "{{deviceId}}",
            bundleId: "{{bundleId}}",
          },
        },
        {
          id: scrollId,
          type: NodeType.IOS_SCROLL_UNTIL_VISIBLE,
          position: { x: NODE_SPACING_X * 3, y: NODE_Y },
          data: {
            variableName: "scrollResult",
            accessibilityId: "{{targetItemId}}",
            direction: "down",
            maxScrolls: "10",
          },
        },
        {
          id: tapItemId,
          type: NodeType.IOS_TAP,
          position: { x: NODE_SPACING_X * 4, y: NODE_Y },
          data: {
            variableName: "itemTap",
            accessibilityId: "{{targetItemId}}",
          },
        },
        {
          id: expectDetailId,
          type: NodeType.IOS_EXPECT_EXISTS,
          position: { x: NODE_SPACING_X * 5, y: NODE_Y },
          data: {
            variableName: "detailExists",
            accessibilityId: "{{detailScreenId}}",
            timeout: "10000",
          },
        },
        {
          id: screenshotId,
          type: NodeType.IOS_SCREENSHOT,
          position: { x: NODE_SPACING_X * 6, y: NODE_Y },
          data: {
            variableName: "screenshot",
            filename: "detail_screen",
          },
        },
      ],
      edges: [
        { id: "e1", source: triggerId, target: bootId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e2", source: bootId, target: launchId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e3", source: launchId, target: scrollId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e4", source: scrollId, target: tapItemId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e5", source: tapItemId, target: expectDetailId, sourceHandle: "source-1", targetHandle: "target-1" },
        { id: "e6", source: expectDetailId, target: screenshotId, sourceHandle: "source-1", targetHandle: "target-1" },
      ],
    },
  };
})();

/**
 * All default templates
 */
export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  buttonTapNavigationTemplate,
  textInputActionTemplate,
  loginFlowTemplate,
  formValidationTemplate,
  listScrollTapTemplate,
];

/**
 * Get a template by ID
 */
export function getDefaultTemplateById(id: string): DefaultTemplate | undefined {
  return DEFAULT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Search templates by tag
 */
export function searchTemplatesByTag(tag: string): DefaultTemplate[] {
  return DEFAULT_TEMPLATES.filter((t) =>
    t.tags.some((templateTag) =>
      templateTag.toLowerCase().includes(tag.toLowerCase()),
    ),
  );
}
