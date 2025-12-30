import { InitialNode } from "@/components/initial-node";
import { NodeType } from "@/generated/prisma/browser";
import type { NodeTypes } from "@xyflow/react";

// Trigger nodes
import { ManualTriggerNode } from "@/features/triggers/components/manual-trigger";
import { GoogleFormTriggerNode } from "@/features/triggers/components/google-form-trigger";
import { StripeTriggerNode } from "@/features/triggers/components/stripe-trigger";

// Execution nodes
import { HttpRequestNode } from "@/features/executions/components/http-request";
import { OpenAiNode } from "@/features/executions/components/openai";
import { AnthropicNode } from "@/features/executions/components/anthropic";
import { GeminiNode } from "@/features/executions/components/gemini";
import { DiscordNode } from "@/features/executions/components/discord";
import { SlackNode } from "@/features/executions/components/slack";

export const nodeComponents = {
  [NodeType.INITIAL]: InitialNode,
  [NodeType.HTTP_REQUEST]: HttpRequestNode,
  [NodeType.MANUAL_TRIGGER]: ManualTriggerNode,
  [NodeType.GOOGLE_FORM_TRIGGER]: GoogleFormTriggerNode,
  [NodeType.STRIPE_TRIGGER]: StripeTriggerNode,
  [NodeType.GEMINI]: GeminiNode,
  [NodeType.OPENAI]: OpenAiNode,
  [NodeType.ANTHROPIC]: AnthropicNode,
  [NodeType.DISCORD]: DiscordNode,
  [NodeType.SLACK]: SlackNode,
} as const satisfies NodeTypes;

export type RegisteredNodeType = keyof typeof nodeComponents;
