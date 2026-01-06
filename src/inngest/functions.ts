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
  iosAppUninstallChannel,
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
import {
  packageExecutionChannel,
  type WorkflowStatus,
} from "./channels/package-execution";

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
      iosAppUninstallChannel(),
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

    const workflowData = await step.run("prepare-workflow", async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { id: workflowId },
        include: {
          nodes: true,
          connections: true,
        },
      });

      return {
        sortedNodes: topologicalSort(workflow.nodes, workflow.connections),
        projectId: workflow.projectId,
      };
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

    // Debug: Log sorted nodes
    console.log("[executeWorkflow] Sorted nodes:", workflowData.sortedNodes.map(n => ({
      id: n.id,
      type: n.type,
      name: (n.data as Record<string, unknown>)?.variableName || n.type,
    })));

    // Execute each node
    for (const node of workflowData.sortedNodes) {
      console.log(`[executeWorkflow] Executing node: ${node.type} (${node.id})`);
      const executor = getExecutor(node.type as NodeType);
      context = await executor({
        data: node.data as Record<string, unknown>,
        nodeId: node.id,
        userId,
        workflowId,
        projectId: workflowData.projectId,
        context,
        step,
        publish,
      });
      console.log(`[executeWorkflow] Node completed: ${node.type} (${node.id})`);
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

// Package execution - executes all workflows in a package
export const executePackage = inngest.createFunction(
  {
    id: "execute-package",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    onFailure: async ({ event }) => {
      const packageId = event.data.event.data?.packageId;
      if (packageId) {
        // Find the execution by packageId and startedAt (most recent)
        const execution = await prisma.packageExecution.findFirst({
          where: { packageId },
          orderBy: { startedAt: "desc" },
        });
        if (execution) {
          await prisma.packageExecution.update({
            where: { id: execution.id },
            data: {
              status: ExecutionStatus.FAILED,
              error: event.data.error.message,
              completedAt: new Date(),
            },
          });
        }
      }
    },
  },
  {
    event: "packages/execute.package",
    channels: [packageExecutionChannel()],
  },
  async ({ event, step, publish }) => {
    const { packageId, executionMode, workflowIds } = event.data;

    if (!packageId || !workflowIds || workflowIds.length === 0) {
      throw new NonRetriableError("Package ID or workflow IDs are missing");
    }

    // Initialize workflow statuses
    const workflowStatuses: Record<string, WorkflowStatus> = {};
    for (const wfId of workflowIds) {
      workflowStatuses[wfId] = "pending";
    }

    // Helper to publish status update
    const publishStatus = async (overallStatus: "running" | "success" | "failed") => {
      await publish(
        packageExecutionChannel().status({
          packageId,
          workflowStatuses: { ...workflowStatuses },
          overallStatus,
        })
      );
    };

    // Create package execution record
    const packageExecution = await step.run(
      "create-package-execution",
      async () => {
        return prisma.packageExecution.create({
          data: {
            packageId,
          },
        });
      }
    );

    // Publish initial status
    await publishStatus("running");

    const results: Record<
      string,
      { status: "success" | "failed"; executionId?: string; error?: string }
    > = {};

    if (executionMode === "PARALLEL") {
      // Mark all as running
      for (const wfId of workflowIds) {
        workflowStatuses[wfId] = "running";
      }
      await publishStatus("running");

      // Execute all workflows in parallel
      await step.run("execute-workflows-parallel", async () => {
        const promises = workflowIds.map(async (workflowId: string) => {
          try {
            await sendWorkflowExecution({ workflowId, packageId });
            results[workflowId] = { status: "success" };
            workflowStatuses[workflowId] = "success";
          } catch (error) {
            results[workflowId] = {
              status: "failed",
              error: error instanceof Error ? error.message : "Unknown error",
            };
            workflowStatuses[workflowId] = "failed";
          }
        });

        await Promise.allSettled(promises);
      });

      // Publish final parallel status
      await publishStatus(
        Object.values(workflowStatuses).some((s) => s === "failed")
          ? "failed"
          : "success"
      );
    } else {
      // Execute workflows sequentially
      for (const workflowId of workflowIds) {
        // Mark current as running
        workflowStatuses[workflowId] = "running";
        await publishStatus("running");

        await step.run(`execute-workflow-${workflowId}`, async () => {
          try {
            await sendWorkflowExecution({ workflowId, packageId });
            results[workflowId] = { status: "success" };
            workflowStatuses[workflowId] = "success";
          } catch (error) {
            results[workflowId] = {
              status: "failed",
              error: error instanceof Error ? error.message : "Unknown error",
            };
            workflowStatuses[workflowId] = "failed";
          }
        });

        // Publish status after each workflow
        await publishStatus("running");
      }
    }

    // Update package execution with results
    const hasFailures = Object.values(results).some(
      (r) => r.status === "failed"
    );

    await step.run("update-package-execution", async () => {
      return prisma.packageExecution.update({
        where: { id: packageExecution.id },
        data: {
          status: hasFailures ? ExecutionStatus.FAILED : ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          results,
        },
      });
    });

    // Publish final status
    await publishStatus(hasFailures ? "failed" : "success");

    return {
      packageId,
      executionId: packageExecution.id,
      results,
    };
  }
);
