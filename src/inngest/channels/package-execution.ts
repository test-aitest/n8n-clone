import { channel, topic } from "@inngest/realtime";

export const PACKAGE_EXECUTION_CHANNEL_NAME = "package-execution";

export type WorkflowStatus = "pending" | "running" | "success" | "failed";

export type NodeExecutionInfo = {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: "running" | "success" | "failed";
};

export type PackageExecutionStatus = {
  packageId: string;
  workflowStatuses: Record<string, WorkflowStatus>;
  overallStatus: "running" | "success" | "failed";
  // Workflow names for display
  workflowNames?: Record<string, string>;
  // Current executing workflow info
  currentWorkflowId?: string;
  currentWorkflowName?: string;
  // Current executing node info
  currentNode?: NodeExecutionInfo;
  // Completed nodes count per workflow
  nodeProgress?: {
    completed: number;
    total: number;
  };
  // Error information
  errorMessage?: string;
  failedWorkflowId?: string;
  failedWorkflowName?: string;
  failedNodeName?: string;
};

export const packageExecutionChannel = channel(PACKAGE_EXECUTION_CHANNEL_NAME).addTopic(
  topic("status").type<PackageExecutionStatus>()
);
