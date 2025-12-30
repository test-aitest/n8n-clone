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
          id: bootId,
          type: NodeType.IOS_SIMULATOR_BOOT,
          position: { x: 250, y: 0 },
          data: {
            variableName: "simulatorBoot",
            deviceId: "{{deviceId}}",
          },
        },
        {
          id: launchId,
          type: NodeType.IOS_APP_LAUNCH,
          position: { x: 250, y: 120 },
          data: {
            variableName: "appLaunch",
            bundleId: "{{bundleId}}",
          },
        },
        {
          id: tapId,
          type: NodeType.IOS_TAP,
          position: { x: 250, y: 240 },
          data: {
            variableName: "buttonTap",
            accessibilityId: "{{buttonId}}",
            timeout: "10000",
          },
        },
        {
          id: expectId,
          type: NodeType.IOS_EXPECT_EXISTS,
          position: { x: 250, y: 360 },
          data: {
            variableName: "screenExists",
            accessibilityId: "{{targetScreenId}}",
            timeout: "10000",
          },
        },
        {
          id: screenshotId,
          type: NodeType.IOS_SCREENSHOT,
          position: { x: 250, y: 480 },
          data: {
            variableName: "screenshot",
            filename: "navigation_result",
          },
        },
      ],
      edges: [
        { id: `e1`, source: bootId, target: launchId },
        { id: `e2`, source: launchId, target: tapId },
        { id: `e3`, source: tapId, target: expectId },
        { id: `e4`, source: expectId, target: screenshotId },
      ],
    },
  };
})();

/**
 * Template 2: Text Input → Action Test
 */
const textInputActionTemplate: DefaultTemplate = (() => {
  resetNodeCounter();
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
          id: bootId,
          type: NodeType.IOS_SIMULATOR_BOOT,
          position: { x: 250, y: 0 },
          data: {
            variableName: "simulatorBoot",
            deviceId: "{{deviceId}}",
          },
        },
        {
          id: launchId,
          type: NodeType.IOS_APP_LAUNCH,
          position: { x: 250, y: 120 },
          data: {
            variableName: "appLaunch",
            bundleId: "{{bundleId}}",
          },
        },
        {
          id: tapFieldId,
          type: NodeType.IOS_TAP,
          position: { x: 250, y: 240 },
          data: {
            variableName: "fieldTap",
            accessibilityId: "{{textFieldId}}",
          },
        },
        {
          id: inputId,
          type: NodeType.IOS_TEXT_INPUT,
          position: { x: 250, y: 360 },
          data: {
            variableName: "textInput",
            accessibilityId: "{{textFieldId}}",
            text: "{{inputText}}",
          },
        },
        {
          id: tapSubmitId,
          type: NodeType.IOS_TAP,
          position: { x: 250, y: 480 },
          data: {
            variableName: "submitTap",
            accessibilityId: "{{submitButtonId}}",
          },
        },
        {
          id: expectId,
          type: NodeType.IOS_EXPECT_EXISTS,
          position: { x: 250, y: 600 },
          data: {
            variableName: "resultExists",
            accessibilityId: "{{resultId}}",
            timeout: "10000",
          },
        },
      ],
      edges: [
        { id: `e1`, source: bootId, target: launchId },
        { id: `e2`, source: launchId, target: tapFieldId },
        { id: `e3`, source: tapFieldId, target: inputId },
        { id: `e4`, source: inputId, target: tapSubmitId },
        { id: `e5`, source: tapSubmitId, target: expectId },
      ],
    },
  };
})();

/**
 * Template 3: Login Flow Test
 */
const loginFlowTemplate: DefaultTemplate = (() => {
  resetNodeCounter();
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
          id: bootId,
          type: NodeType.IOS_SIMULATOR_BOOT,
          position: { x: 250, y: 0 },
          data: {
            variableName: "simulatorBoot",
            deviceId: "{{deviceId}}",
          },
        },
        {
          id: launchId,
          type: NodeType.IOS_APP_LAUNCH,
          position: { x: 250, y: 120 },
          data: {
            variableName: "appLaunch",
            bundleId: "{{bundleId}}",
          },
        },
        {
          id: tapEmailId,
          type: NodeType.IOS_TAP,
          position: { x: 250, y: 240 },
          data: {
            variableName: "emailFieldTap",
            accessibilityId: "{{emailFieldId}}",
          },
        },
        {
          id: inputEmailId,
          type: NodeType.IOS_TEXT_INPUT,
          position: { x: 250, y: 360 },
          data: {
            variableName: "emailInput",
            accessibilityId: "{{emailFieldId}}",
            text: "{{testEmail}}",
          },
        },
        {
          id: tapPasswordId,
          type: NodeType.IOS_TAP,
          position: { x: 250, y: 480 },
          data: {
            variableName: "passwordFieldTap",
            accessibilityId: "{{passwordFieldId}}",
          },
        },
        {
          id: inputPasswordId,
          type: NodeType.IOS_TEXT_INPUT,
          position: { x: 250, y: 600 },
          data: {
            variableName: "passwordInput",
            accessibilityId: "{{passwordFieldId}}",
            text: "{{testPassword}}",
          },
        },
        {
          id: tapLoginId,
          type: NodeType.IOS_TAP,
          position: { x: 250, y: 720 },
          data: {
            variableName: "loginButtonTap",
            accessibilityId: "{{loginButtonId}}",
          },
        },
        {
          id: expectHomeId,
          type: NodeType.IOS_EXPECT_EXISTS,
          position: { x: 250, y: 840 },
          data: {
            variableName: "homeScreenExists",
            accessibilityId: "{{homeScreenId}}",
            timeout: "15000",
          },
        },
        {
          id: screenshotId,
          type: NodeType.IOS_SCREENSHOT,
          position: { x: 250, y: 960 },
          data: {
            variableName: "screenshot",
            filename: "login_success",
          },
        },
      ],
      edges: [
        { id: `e1`, source: bootId, target: launchId },
        { id: `e2`, source: launchId, target: tapEmailId },
        { id: `e3`, source: tapEmailId, target: inputEmailId },
        { id: `e4`, source: inputEmailId, target: tapPasswordId },
        { id: `e5`, source: tapPasswordId, target: inputPasswordId },
        { id: `e6`, source: inputPasswordId, target: tapLoginId },
        { id: `e7`, source: tapLoginId, target: expectHomeId },
        { id: `e8`, source: expectHomeId, target: screenshotId },
      ],
    },
  };
})();

/**
 * Template 4: Form Validation Test
 */
const formValidationTemplate: DefaultTemplate = (() => {
  resetNodeCounter();
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
          id: bootId,
          type: NodeType.IOS_SIMULATOR_BOOT,
          position: { x: 250, y: 0 },
          data: {
            variableName: "simulatorBoot",
            deviceId: "{{deviceId}}",
          },
        },
        {
          id: launchId,
          type: NodeType.IOS_APP_LAUNCH,
          position: { x: 250, y: 120 },
          data: {
            variableName: "appLaunch",
            bundleId: "{{bundleId}}",
          },
        },
        {
          id: tapFieldId,
          type: NodeType.IOS_TAP,
          position: { x: 250, y: 240 },
          data: {
            variableName: "fieldTap",
            accessibilityId: "{{inputFieldId}}",
          },
        },
        {
          id: inputInvalidId,
          type: NodeType.IOS_TEXT_INPUT,
          position: { x: 250, y: 360 },
          data: {
            variableName: "invalidInput",
            accessibilityId: "{{inputFieldId}}",
            text: "{{invalidInput}}",
          },
        },
        {
          id: tapSubmitId,
          type: NodeType.IOS_TAP,
          position: { x: 250, y: 480 },
          data: {
            variableName: "submitTap",
            accessibilityId: "{{submitButtonId}}",
          },
        },
        {
          id: expectErrorId,
          type: NodeType.IOS_EXPECT_EXISTS,
          position: { x: 250, y: 600 },
          data: {
            variableName: "errorExists",
            accessibilityId: "{{errorMessageId}}",
            timeout: "5000",
          },
        },
        {
          id: screenshotId,
          type: NodeType.IOS_SCREENSHOT,
          position: { x: 250, y: 720 },
          data: {
            variableName: "screenshot",
            filename: "validation_error",
          },
        },
      ],
      edges: [
        { id: `e1`, source: bootId, target: launchId },
        { id: `e2`, source: launchId, target: tapFieldId },
        { id: `e3`, source: tapFieldId, target: inputInvalidId },
        { id: `e4`, source: inputInvalidId, target: tapSubmitId },
        { id: `e5`, source: tapSubmitId, target: expectErrorId },
        { id: `e6`, source: expectErrorId, target: screenshotId },
      ],
    },
  };
})();

/**
 * Template 5: List Scroll → Item Tap Test
 */
const listScrollTapTemplate: DefaultTemplate = (() => {
  resetNodeCounter();
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
          id: bootId,
          type: NodeType.IOS_SIMULATOR_BOOT,
          position: { x: 250, y: 0 },
          data: {
            variableName: "simulatorBoot",
            deviceId: "{{deviceId}}",
          },
        },
        {
          id: launchId,
          type: NodeType.IOS_APP_LAUNCH,
          position: { x: 250, y: 120 },
          data: {
            variableName: "appLaunch",
            bundleId: "{{bundleId}}",
          },
        },
        {
          id: scrollId,
          type: NodeType.IOS_SCROLL_UNTIL_VISIBLE,
          position: { x: 250, y: 240 },
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
          position: { x: 250, y: 360 },
          data: {
            variableName: "itemTap",
            accessibilityId: "{{targetItemId}}",
          },
        },
        {
          id: expectDetailId,
          type: NodeType.IOS_EXPECT_EXISTS,
          position: { x: 250, y: 480 },
          data: {
            variableName: "detailExists",
            accessibilityId: "{{detailScreenId}}",
            timeout: "10000",
          },
        },
        {
          id: screenshotId,
          type: NodeType.IOS_SCREENSHOT,
          position: { x: 250, y: 600 },
          data: {
            variableName: "screenshot",
            filename: "detail_screen",
          },
        },
      ],
      edges: [
        { id: `e1`, source: bootId, target: launchId },
        { id: `e2`, source: launchId, target: scrollId },
        { id: `e3`, source: scrollId, target: tapItemId },
        { id: `e4`, source: tapItemId, target: expectDetailId },
        { id: `e5`, source: expectDetailId, target: screenshotId },
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
