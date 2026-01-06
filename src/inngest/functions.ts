import { NonRetriableError } from "inngest";
import { inngest } from "./client";
import prisma from "@/lib/db";
import {
  topologicalSort,
  sendWorkflowExecution,
  sendScheduledExecution,
} from "./utils";
import { ExecutionStatus, NodeType, Prisma } from "@/generated/prisma/client";
import { getExecutor } from "@/features/executions/lib/executor-registry";
import { stopVideoRecording } from "@/features/ios-testing/components/video-recording/executor";
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
  iosVideoRecordingChannel,
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
  type NodeExecutionInfo,
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
      iosVideoRecordingChannel(),
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

    // Execute each node with try-finally to ensure video recording stops
    let hasVideoRecording = false;
    try {
      for (const node of workflowData.sortedNodes) {
        // Check if this is a video recording node
        if (node.type === NodeType.IOS_VIDEO_RECORDING) {
          hasVideoRecording = true;
        }

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
      }
    } finally {
      // Stop any active video recording
      if (hasVideoRecording) {
        await step.run("stop-video-recording", async () => {
          await stopVideoRecording();
        });
      }
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

// Event-driven schedule handler: When a schedule trigger is updated, schedule the next execution
export const handleScheduleUpdated = inngest.createFunction(
  {
    id: "handle-schedule-updated",
  },
  {
    event: "workflows/schedule.updated",
  },
  async ({ event, step }) => {
    const { workflowId, cronExpression, scheduleVersion } = event.data;

    // Calculate the next execution time
    const nextExecutionTime = await step.run(
      "calculate-next-execution",
      async () => {
        try {
          const cron = CronExpressionParser.parse(cronExpression);
          const nextDate = cron.next();
          return nextDate.toISOString();
        } catch {
          return null;
        }
      }
    );

    if (!nextExecutionTime) {
      return { error: "Invalid cron expression", workflowId };
    }

    // Schedule the next execution
    await step.run("schedule-next-execution", async () => {
      await sendScheduledExecution({
        workflowId,
        cronExpression,
        scheduleVersion,
        scheduledAt: new Date(nextExecutionTime),
      });
    });

    return {
      workflowId,
      scheduledAt: nextExecutionTime,
      scheduleVersion,
    };
  }
);

// Event-driven schedule executor: Execute the workflow at the scheduled time
export const executeScheduledWorkflow = inngest.createFunction(
  {
    id: "execute-scheduled-workflow",
  },
  {
    event: "workflows/schedule.execute",
  },
  async ({ event, step }) => {
    const { workflowId, cronExpression, scheduleVersion } = event.data;

    // Verify the schedule is still valid (hasn't been changed)
    const isValid = await step.run("verify-schedule", async () => {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
        include: {
          nodes: {
            where: { type: NodeType.SCHEDULE_TRIGGER },
          },
        },
      });

      if (!workflow || workflow.nodes.length === 0) {
        return {
          valid: false,
          reason: "Workflow or schedule trigger not found",
        };
      }

      // Check if the schedule version matches (workflow hasn't been updated)
      const currentVersion = workflow.updatedAt.toISOString();
      if (currentVersion !== scheduleVersion) {
        return { valid: false, reason: "Schedule has been updated" };
      }

      // Verify cron expression matches
      const node = workflow.nodes[0];
      const data = node.data as { preset?: string; cronExpression?: string };
      const currentCron =
        data.preset === "custom" ? data.cronExpression : data.preset;

      if (currentCron !== cronExpression) {
        return { valid: false, reason: "Cron expression has changed" };
      }

      return { valid: true, reason: null };
    });

    if (!isValid.valid) {
      return { skipped: true, reason: isValid.reason || "Unknown", workflowId };
    }

    // Execute the workflow
    await step.run("execute-workflow", async () => {
      await sendWorkflowExecution({ workflowId });
    });

    // Schedule the next execution
    const nextExecutionTime = await step.run(
      "calculate-next-execution",
      async () => {
        try {
          const cron = CronExpressionParser.parse(cronExpression);
          const nextDate = cron.next();
          return nextDate.toISOString();
        } catch {
          return null;
        }
      }
    );

    if (nextExecutionTime) {
      // Get the latest schedule version
      const latestVersion = await step.run("get-latest-version", async () => {
        const workflow = await prisma.workflow.findUnique({
          where: { id: workflowId },
          select: { updatedAt: true },
        });
        return workflow?.updatedAt.toISOString() || scheduleVersion;
      });

      await step.run("schedule-next", async () => {
        await sendScheduledExecution({
          workflowId,
          cronExpression,
          scheduleVersion: latestVersion,
          scheduledAt: new Date(nextExecutionTime),
        });
      });
    }

    return {
      executed: true,
      workflowId,
      nextScheduledAt: nextExecutionTime,
    };
  }
);

// Package execution - executes all workflows in a package with node-level progress tracking
export const executePackage = inngest.createFunction(
  {
    id: "execute-package",
    retries: process.env.NODE_ENV === "production" ? 3 : 0,
    onFailure: async ({ event }) => {
      const packageId = event.data.event.data?.packageId;
      if (packageId) {
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

    // Get workflow data including nodes
    const workflowsData = await step.run("get-workflows-data", async () => {
      const workflows = await prisma.workflow.findMany({
        where: { id: { in: workflowIds } },
        include: {
          nodes: true,
          connections: true,
        },
      });
      return workflows;
    });

    // Create workflow name map
    const workflowNames: Record<string, string> = {};
    for (const wf of workflowsData) {
      workflowNames[wf.id] = wf.name;
    }

    // Initialize workflow statuses
    const workflowStatuses: Record<string, WorkflowStatus> = {};
    for (const wfId of workflowIds) {
      workflowStatuses[wfId] = "pending";
    }

    // Track error and node information
    let errorInfo: {
      errorMessage?: string;
      failedWorkflowId?: string;
      failedWorkflowName?: string;
      failedNodeName?: string;
    } = {};
    let currentNode: NodeExecutionInfo | undefined;
    let nodeProgress: { completed: number; total: number } | undefined;

    // Helper to publish status update
    const publishStatus = async (
      overallStatus: "running" | "success" | "failed",
      currentWorkflowId?: string,
      nodeInfo?: {
        currentNode?: NodeExecutionInfo;
        nodeProgress?: { completed: number; total: number };
      }
    ) => {
      const statusData = {
        packageId,
        workflowStatuses: { ...workflowStatuses },
        overallStatus,
        workflowNames,
        currentWorkflowId,
        currentWorkflowName: currentWorkflowId
          ? workflowNames[currentWorkflowId]
          : undefined,
        currentNode: nodeInfo?.currentNode ?? currentNode,
        nodeProgress: nodeInfo?.nodeProgress ?? nodeProgress,
        ...errorInfo,
      };
      await publish(packageExecutionChannel().status(statusData));
    };

    // Create package execution record
    const packageExecution = await step.run(
      "create-package-execution",
      async () => {
        return prisma.packageExecution.create({ data: { packageId } });
      }
    );

    // Publish initial status
    await publishStatus("running");

    const results: Record<
      string,
      { status: "success" | "failed"; error?: string }
    > = {};

    // Helper function to execute a single workflow with node progress tracking
    const executeWorkflowWithProgress = async (
      workflowId: string
    ): Promise<{
      success: boolean;
      error?: string;
      failedNodeName?: string;
      failedNodeInfo?: NodeExecutionInfo;
    }> => {
      const workflow = workflowsData.find((w) => w.id === workflowId);
      if (!workflow) {
        throw new Error(`Workflow not found: ${workflowId}`);
      }

      const sortedNodes = topologicalSort(workflow.nodes, workflow.connections);
      const totalNodes = sortedNodes.length;
      let completedNodes = 0;

      // Get userId
      const userId = await step.run(`get-user-${workflowId}`, async () => {
        const wf = await prisma.workflow.findUniqueOrThrow({
          where: { id: workflowId },
          select: { userId: true },
        });
        return wf.userId;
      });

      // Create execution record
      const executionId = await step.run(
        `create-execution-${workflowId}`,
        async () => {
          const execution = await prisma.execution.create({
            data: {
              workflowId,
              inngestEventId: `pkg-${packageExecution.id}-${workflowId}`,
            },
          });
          return execution.id;
        }
      );

      let context: Record<string, unknown> = {};
      let hasVideoRecording = false;
      // Local tracking of current node
      let localCurrentNode: NodeExecutionInfo | null = null;

      try {
        for (const node of sortedNodes) {
          const nodeData = node.data as Record<string, unknown>;
          const nodeName = (nodeData?.variableName as string) || node.type;

          // Update current node info
          localCurrentNode = {
            nodeId: node.id,
            nodeName,
            nodeType: node.type,
            status: "running",
          };
          currentNode = localCurrentNode;
          nodeProgress = { completed: completedNodes, total: totalNodes };

          await publishStatus("running", workflowId, {
            currentNode: localCurrentNode,
            nodeProgress: { completed: completedNodes, total: totalNodes },
          });

          if (node.type === NodeType.IOS_VIDEO_RECORDING) {
            hasVideoRecording = true;
          }

          // Execute the node
          const executor = getExecutor(node.type as NodeType);
          context = await executor({
            data: nodeData,
            nodeId: node.id,
            userId,
            workflowId,
            projectId: workflow.projectId,
            context,
            step,
            publish,
          });

          completedNodes++;
          localCurrentNode = {
            nodeId: localCurrentNode.nodeId,
            nodeName: localCurrentNode.nodeName,
            nodeType: localCurrentNode.nodeType,
            status: "success",
          };
          currentNode = localCurrentNode;
          nodeProgress = { completed: completedNodes, total: totalNodes };
          await publishStatus("running", workflowId, {
            currentNode: localCurrentNode,
            nodeProgress: { completed: completedNodes, total: totalNodes },
          });
        }

        // Stop video recording if needed
        if (hasVideoRecording) {
          await step.run(`stop-video-${workflowId}`, async () => {
            await stopVideoRecording();
          });
        }

        // Update execution as success
        await step.run(`complete-execution-${workflowId}`, async () => {
          await prisma.execution.update({
            where: { id: executionId },
            data: {
              status: ExecutionStatus.SUCCESS,
              completedAt: new Date(),
              output: context as Prisma.InputJsonValue,
            },
          });
        });

        return { success: true };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Stop video recording on error
        if (hasVideoRecording) {
          try {
            await stopVideoRecording();
          } catch {
            // Ignore stop error
          }
        }

        // Update execution as failed
        await step.run(`fail-execution-${workflowId}`, async () => {
          await prisma.execution.update({
            where: { id: executionId },
            data: {
              status: ExecutionStatus.FAILED,
              completedAt: new Date(),
              error: errorMessage,
            },
          });
        });

        // Return failure with node info
        const failedNodeInfo = localCurrentNode
          ? {
              nodeId: localCurrentNode.nodeId,
              nodeName: localCurrentNode.nodeName,
              nodeType: localCurrentNode.nodeType,
              status: "failed" as const,
            }
          : undefined;

        return {
          success: false,
          error: errorMessage,
          failedNodeName: localCurrentNode?.nodeName,
          failedNodeInfo,
        };
      }
    };

    // Execute workflows
    if (executionMode === "PARALLEL") {
      // Mark all as running
      for (const wfId of workflowIds) {
        workflowStatuses[wfId] = "running";
      }
      await publishStatus("running");

      // Execute in parallel (simplified - without detailed node tracking for parallel)
      const parallelResults = await Promise.allSettled(
        workflowIds.map(async (workflowId: string) => {
          try {
            const result = await step.invoke(`invoke-workflow-${workflowId}`, {
              function: executeWorkflow,
              data: { workflowId },
            });
            return { workflowId, status: "success" as const, result };
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown error";
            return {
              workflowId,
              status: "failed" as const,
              error: errorMessage,
            };
          }
        })
      );

      for (const settledResult of parallelResults) {
        if (settledResult.status === "fulfilled") {
          const { workflowId, status, error } = settledResult.value;
          results[workflowId] = { status, error };
          workflowStatuses[workflowId] = status;
          if (status === "failed" && error && !errorInfo.errorMessage) {
            errorInfo = {
              errorMessage: error,
              failedWorkflowId: workflowId,
              failedWorkflowName: workflowNames[workflowId],
            };
          }
        } else {
          const workflowId =
            workflowIds[parallelResults.indexOf(settledResult)];
          const errorMessage = settledResult.reason?.message || "Unknown error";
          results[workflowId] = { status: "failed", error: errorMessage };
          workflowStatuses[workflowId] = "failed";
          if (!errorInfo.errorMessage) {
            errorInfo = {
              errorMessage,
              failedWorkflowId: workflowId,
              failedWorkflowName: workflowNames[workflowId],
            };
          }
        }
      }

      const hasFailed = Object.values(workflowStatuses).some(
        (s) => s === "failed"
      );
      await publishStatus(hasFailed ? "failed" : "success");
    } else {
      // Execute workflows sequentially with node-level progress
      for (const workflowId of workflowIds) {
        workflowStatuses[workflowId] = "running";
        currentNode = undefined;
        nodeProgress = undefined;
        await publishStatus("running", workflowId);

        const result = await executeWorkflowWithProgress(workflowId);

        if (result.success) {
          results[workflowId] = { status: "success" };
          workflowStatuses[workflowId] = "success";
        } else {
          results[workflowId] = { status: "failed", error: result.error };
          workflowStatuses[workflowId] = "failed";
          errorInfo = {
            errorMessage: result.error,
            failedWorkflowId: workflowId,
            failedWorkflowName: workflowNames[workflowId],
            failedNodeName: result.failedNodeName,
          };
          // Use the failedNodeInfo from result
          if (result.failedNodeInfo) {
            currentNode = result.failedNodeInfo;
          }
          await publishStatus("failed", workflowId, {
            currentNode: result.failedNodeInfo,
            nodeProgress,
          });
          break;
        }
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
          status: hasFailures
            ? ExecutionStatus.FAILED
            : ExecutionStatus.SUCCESS,
          completedAt: new Date(),
          results,
          error: errorInfo.errorMessage,
        },
      });
    });

    // Publish final status
    currentNode = undefined;
    await publishStatus(hasFailures ? "failed" : "success");

    return { packageId, executionId: packageExecution.id, results };
  }
);
