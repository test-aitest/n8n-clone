import { channel, topic } from "@inngest/realtime";

export const PACKAGE_EXECUTION_CHANNEL_NAME = "package-execution";

export type WorkflowStatus = "pending" | "running" | "success" | "failed";

export type PackageExecutionStatus = {
  packageId: string;
  workflowStatuses: Record<string, WorkflowStatus>;
  overallStatus: "running" | "success" | "failed";
};

export const packageExecutionChannel = channel(PACKAGE_EXECUTION_CHANNEL_NAME).addTopic(
  topic("status").type<PackageExecutionStatus>()
);
