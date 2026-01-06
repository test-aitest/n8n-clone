import toposort from "toposort";
import { inngest } from "./client";
import { createId } from "@paralleldrive/cuid2";

// Generic types for topological sort to support both raw Prisma types and JsonifyObject
type MinimalNode = { id: string };
type MinimalConnection = { fromNodeId: string; toNodeId: string };

export const topologicalSort = <T extends MinimalNode>(
  nodes: T[],
  connections: MinimalConnection[]
): T[] => {
  // If no connections, return node as-is (they're all independent)
  if (connections.length === 0) {
    return nodes;
  }

  // Create edges array for toposort
  const edges: [string, string][] = connections.map((conn) => [
    conn.fromNodeId,
    conn.toNodeId,
  ]);

  // Add nodes with no connections as self-edges to ensure they're included
  const connectedNodeIds = new Set<string>();
  for (const conn of connections) {
    connectedNodeIds.add(conn.fromNodeId);
    connectedNodeIds.add(conn.toNodeId);
  }

  for (const node of nodes) {
    if (!connectedNodeIds.has(node.id)) {
      edges.push([node.id, node.id]);
    }
  }

  // Perform topological sort
  let sortedNodeIds: string[];
  try {
    sortedNodeIds = toposort(edges);
    // Remove duplicates (from self-edges)
    sortedNodeIds = [...new Set(sortedNodeIds)];
  } catch (error) {
    if (error instanceof Error && error.message.includes("Cyclic")) {
      throw new Error("Workflow contains a cycle");
    }
    throw error;
  }

  // Map sorted IDs back to node objects
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  return sortedNodeIds.map((id) => nodeMap.get(id)!).filter(Boolean);
};

export const sendWorkflowExecution = async (data: {
  workflowId: string;
  [key: string]: unknown;
}) => {
  return inngest.send({
    name: "workflows/execute.workflow",
    data,
    id: createId(),
  });
};

export const sendPackageExecution = async (data: {
  packageId: string;
  executionMode: string;
  workflowIds: string[];
}) => {
  return inngest.send({
    name: "packages/execute.package",
    data,
    id: createId(),
  });
};

// Send event when a schedule trigger is created or updated
export const sendScheduleUpdated = async (data: {
  workflowId: string;
  cronExpression: string;
  scheduleVersion: string; // Use workflow's updatedAt timestamp as version
}) => {
  return inngest.send({
    name: "workflows/schedule.updated",
    data,
    id: createId(),
  });
};

// Send event to execute a scheduled workflow at a specific time
export const sendScheduledExecution = async (data: {
  workflowId: string;
  cronExpression: string;
  scheduleVersion: string;
  scheduledAt: Date;
}) => {
  return inngest.send({
    name: "workflows/schedule.execute",
    data,
    id: createId(),
    ts: data.scheduledAt.getTime(), // Schedule for future execution
  });
};
