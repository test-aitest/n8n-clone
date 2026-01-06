"use client";

import type { Realtime } from "@inngest/realtime";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  PACKAGE_EXECUTION_CHANNEL_NAME,
  type PackageExecutionStatus,
  type WorkflowStatus,
  type NodeExecutionInfo,
} from "@/inngest/channels/package-execution";

interface UsePackageExecutionStatusOptions {
  packageId: string;
  refreshToken: () => Promise<Realtime.Subscribe.Token>;
}

export interface PackageStatus {
  isRunning: boolean;
  overallStatus: "idle" | "running" | "success" | "failed";
  workflowStatuses: Record<string, WorkflowStatus>;
  workflowNames: Record<string, string>;
  counts: {
    total: number;
    pending: number;
    running: number;
    success: number;
    failed: number;
  };
  // Current executing workflow
  currentWorkflowId?: string;
  currentWorkflowName?: string;
  // Current executing node
  currentNode?: NodeExecutionInfo;
  // Node progress
  nodeProgress?: {
    completed: number;
    total: number;
  };
  // Error information
  errorMessage?: string;
  failedWorkflowId?: string;
  failedWorkflowName?: string;
  failedNodeName?: string;
  // Reset function to clear status
  reset?: () => void;
}

export function usePackageExecutionStatus({
  packageId,
  refreshToken,
}: UsePackageExecutionStatusOptions): PackageStatus {
  const [status, setStatus] = useState<PackageStatus>({
    isRunning: false,
    overallStatus: "idle",
    workflowStatuses: {},
    workflowNames: {},
    counts: {
      total: 0,
      pending: 0,
      running: 0,
      success: 0,
      failed: 0,
    },
  });

  // Track the current run ID to prevent old messages from overwriting
  const currentRunIdRef = useRef<string | null>(null);
  // Track if execution has completed (success or failed)
  const isCompletedRef = useRef(false);

  // Reset function to allow starting a new execution
  const reset = useCallback(() => {
    currentRunIdRef.current = null;
    isCompletedRef.current = false;
    setStatus({
      isRunning: false,
      overallStatus: "idle",
      workflowStatuses: {},
      workflowNames: {},
      counts: {
        total: 0,
        pending: 0,
        running: 0,
        success: 0,
        failed: 0,
      },
    });
  }, []);

  // Note: Always enable subscription as the hook doesn't re-initialize properly
  // when enabled changes from false to true after initial mount
  const { data } = useInngestSubscription({
    refreshToken,
    enabled: true,
  });

  useEffect(() => {
    if (!data?.length) {
      return;
    }

    // Find the latest message for this package
    const latestMessage = data
      .filter(
        (msg) =>
          msg.kind === "data" &&
          msg.channel === PACKAGE_EXECUTION_CHANNEL_NAME &&
          msg.topic === "status" &&
          (msg.data as PackageExecutionStatus).packageId === packageId
      )
      .sort((a, b) => {
        if (a.kind === "data" && b.kind === "data") {
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        return 0;
      })[0];

    if (latestMessage?.kind === "data") {
      const msgData = latestMessage.data as PackageExecutionStatus;
      const messageRunId = (latestMessage as { runId?: string }).runId;

      // If we have a current run and this message is from a different run
      if (currentRunIdRef.current && messageRunId !== currentRunIdRef.current) {
        // If current execution is completed, ignore messages from other runs
        if (isCompletedRef.current) {
          return;
        }
        // If new run is starting (has "running" status), accept it as new execution
        if (msgData.overallStatus !== "running") {
          return;
        }
      }

      // Track the run ID
      if (messageRunId) {
        currentRunIdRef.current = messageRunId;
      }

      // Track completion state
      if (msgData.overallStatus === "success" || msgData.overallStatus === "failed") {
        isCompletedRef.current = true;
      } else if (msgData.overallStatus === "running") {
        isCompletedRef.current = false;
      }

      const statuses = Object.values(msgData.workflowStatuses);

      setStatus({
        isRunning: msgData.overallStatus === "running",
        overallStatus: msgData.overallStatus,
        workflowStatuses: msgData.workflowStatuses,
        workflowNames: msgData.workflowNames || {},
        counts: {
          total: statuses.length,
          pending: statuses.filter((s) => s === "pending").length,
          running: statuses.filter((s) => s === "running").length,
          success: statuses.filter((s) => s === "success").length,
          failed: statuses.filter((s) => s === "failed").length,
        },
        currentWorkflowId: msgData.currentWorkflowId,
        currentWorkflowName: msgData.currentWorkflowName,
        currentNode: msgData.currentNode,
        nodeProgress: msgData.nodeProgress,
        errorMessage: msgData.errorMessage,
        failedWorkflowId: msgData.failedWorkflowId,
        failedWorkflowName: msgData.failedWorkflowName,
        failedNodeName: msgData.failedNodeName,
        reset,
      });
    }
  }, [data, packageId, reset]);

  return { ...status, reset };
}
