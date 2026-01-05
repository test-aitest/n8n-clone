"use client";

import type { Realtime } from "@inngest/realtime";
import { useInngestSubscription } from "@inngest/realtime/hooks";
import { useEffect, useState } from "react";
import {
  PACKAGE_EXECUTION_CHANNEL_NAME,
  type PackageExecutionStatus,
  type WorkflowStatus,
} from "@/inngest/channels/package-execution";

interface UsePackageExecutionStatusOptions {
  packageId: string;
  refreshToken: () => Promise<Realtime.Subscribe.Token>;
  enabled?: boolean;
}

export interface PackageStatus {
  isRunning: boolean;
  overallStatus: "idle" | "running" | "success" | "failed";
  workflowStatuses: Record<string, WorkflowStatus>;
  counts: {
    total: number;
    pending: number;
    running: number;
    success: number;
    failed: number;
  };
}

export function usePackageExecutionStatus({
  packageId,
  refreshToken,
  enabled = true,
}: UsePackageExecutionStatusOptions): PackageStatus {
  const [status, setStatus] = useState<PackageStatus>({
    isRunning: false,
    overallStatus: "idle",
    workflowStatuses: {},
    counts: {
      total: 0,
      pending: 0,
      running: 0,
      success: 0,
      failed: 0,
    },
  });

  const { data } = useInngestSubscription({
    refreshToken,
    enabled,
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
      const statuses = Object.values(msgData.workflowStatuses);

      setStatus({
        isRunning: msgData.overallStatus === "running",
        overallStatus: msgData.overallStatus,
        workflowStatuses: msgData.workflowStatuses,
        counts: {
          total: statuses.length,
          pending: statuses.filter((s) => s === "pending").length,
          running: statuses.filter((s) => s === "running").length,
          success: statuses.filter((s) => s === "success").length,
          failed: statuses.filter((s) => s === "failed").length,
        },
      });
    }
  }, [data, packageId]);

  return status;
}
