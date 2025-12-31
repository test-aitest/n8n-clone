import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import { topologicalSort } from "./utils";
import { sendWorkflowExecution } from "./utils";
import { ExecutionStatus, NodeType } from "@/generated/prisma/client";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { CronExpressionParser } from "cron-parser";
import { httpRequestChannel } from "./channels/http-request";
import { manualTriggerChannel } from "./channels/manual-trigger";
import { scheduleTriggerChannel } from "./channels/schedule-trigger";
import { intervalTriggerChannel } from "./channels/interval-trigger";
import { geminiChannel } from "./channels/gemini";
import { openAiChannel } from "./channels/openai";
import { anthropicChannel } from "./channels/anthropic";
import { discordChannel } from "./channels/discord";
import { slackChannel } from "./channels/slack";
import {
  iosSimulatorBootChannel,
  iosSimulatorShutdownChannel,
  iosAppInstallChannel,
  iosAppLaunchChannel,
  iosAppTerminateChannel,
  iosTapChannel,
  iosTextInputChannel,
  iosSwipeChannel,
  iosScrollUntilVisibleChannel,
  iosPickerSelectChannel,
  iosSliderSetChannel,
  iosToggleSwitchChannel,
  iosScreenshotChannel,
  iosWaitChannel,
  iosExpectExistsChannel,
  iosExpectTextChannel,
  iosExpectValueChannel,
  iosExpectVisualChannel,
  iosUiScanChannel,
} from "./channels/ios-testing";

export const executeWorkflow = inngest.createFunction(
  {
    id: "execute-workflow",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    onFailure: async ({ event }) => {
      return prisma.execution.update({
        where: { inngestEventId: event.data.event.id },
        data: {
          status: ExecutionStatus.FAILED,
          error: event.data.error.message,
          errorStack: event.data.error.stack,
        },
      });
    },
  },
  {
    event: "workflows/execute.workflow",
    channels: [
      httpRequestChannel(),
      manualTriggerChannel(),
      scheduleTriggerChannel(),
      intervalTriggerChannel(),
      geminiChannel(),
      openAiChannel(),
      anthropicChannel(),
      discordChannel(),
      slackChannel(),
      // iOS Testing channels
      iosSimulatorBootChannel(),
      iosSimulatorShutdownChannel(),
      iosAppInstallChannel(),
      iosAppLaunchChannel(),
      iosAppTerminateChannel(),
      iosTapChannel(),
      iosTextInputChannel(),
      iosSwipeChannel(),
      iosScrollUntilVisibleChannel(),
      iosPickerSelectChannel(),
      iosSliderSetChannel(),
      iosToggleSwitchChannel(),
      iosScreenshotChannel(),
      iosWaitChannel(),
      iosExpectExistsChannel(),
      iosExpectTextChannel(),
      iosExpectValueChannel(),
      iosExpectVisualChannel(),
      iosUiScanChannel(),
    ],
  },
  async ({ event, step, publish }) => {
    const inngestEventId = event.id;
    const workflowId = event.data.workflowId;

    if (!inngestEventId || !workflowId) {
      throw new NonRetriableError("Event ID or workflow ID is missing");
    }

    await step.run("create-execution", async () => {
      return prisma.execution.create({
        data: {
          workflowId,
          inngestEventId,
        },
      });
    });

    const sortedNodes = await step.run("prepare-workflow", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
          nodes: true,
          connections: true,
        },
      });

      return topologicalSort(workflow.nodes, workflow.connections);
    });

    const userId = await step.run("find-user-id", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        select: {
          userId: true,
        },
      });

      return workflow.userId;
    });

    // Initialize context with any initial data from the trigger
    let context = event.data.initialData || {};

    // Execute each node
    for (const node of sortedNodes) {
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        context,
        step,
        publish,
      });
    }

    await step.run("update-execution", async () => {
      return prisma.execution.update({
        where: { inngestEventId, workflowId },
        data: {
          status: ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          output: context,
        },
      });
    });

    return {
      workflowId,
      result: context,
    };
  }
);

// Scheduled workflow checker - runs every minute
export const scheduledWorkflowChecker = inngest.createFunction(
  {
    id: "scheduled-workflow-checker",
  },
  {
    cron: "* * * * *", // Every minute
  },
  async ({ step }) => {
    const now = new Date();
    const currentMinute = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      0,
      0
    );

    // Find all workflows with SCHEDULE_TRIGGER nodes
    const scheduledWorkflows = await step.run(
      "find-scheduled-workflows",
      async () => {
        const nodes = await prisma.node.findMany({
          where: {
            type: NodeType.SCHEDULE_TRIGGER,
          },
          include: {
            workflow: true,
          },
        });

        return nodes;
      }
    );

    // Check each scheduled workflow
    for (const node of scheduledWorkflows) {
      const data = node.data as { preset?: string; cronExpression?: string };
      const cronExpr =
        data.preset === "custom" ? data.cronExpression : data.preset;

      if (!cronExpr) continue;

      try {
        const cron = CronExpressionParser.parse(cronExpr);
        const prevDate = cron.prev();

        // Check if the cron matches current minute
        if (
          prevDate.getFullYear() === currentMinute.getFullYear() &&
          prevDate.getMonth() === currentMinute.getMonth() &&
          prevDate.getDate() === currentMinute.getDate() &&
          prevDate.getHours() === currentMinute.getHours() &&
          prevDate.getMinutes() === currentMinute.getMinutes()
        ) {
          // Execute this workflow
          await step.run(`execute-${node.workflowId}`, async () => {
            await sendWorkflowExecution({ workflowId: node.workflowId });
          });
        }
      } catch {
        // Invalid cron expression, skip
        console.error(`Invalid cron expression for workflow ${node.workflowId}: ${cronExpr}`);
      }
    }

    return { checked: scheduledWorkflows.length };
  }
);
