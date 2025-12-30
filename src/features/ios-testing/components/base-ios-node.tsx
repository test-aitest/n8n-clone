"use client";

import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import type { LucideIcon } from "lucide-react";
import { memo, type ReactNode } from "react";
import { BaseNode, BaseNodeContent } from "@/components/react-flow/base-node";
import { BaseHandle } from "@/components/react-flow/base-handle";
import { WorkflowNode } from "@/components/workflow-node";
import {
  type NodeStatus,
  NodeStatusIndicator,
} from "@/components/react-flow/node-status-indicator";

interface BaseIOSNodeProps extends NodeProps {
  icon: LucideIcon;
  name: string;
  description?: string;
  children?: ReactNode;
  status?: NodeStatus;
  category?: "simulator" | "interaction" | "expect" | "analysis";
  onSettings?: () => void;
  onDoubleClick?: () => void;
}

// Category color mapping
const categoryColors: Record<string, string> = {
  simulator: "border-l-blue-500",
  interaction: "border-l-green-500",
  expect: "border-l-purple-500",
  analysis: "border-l-orange-500",
};

export const BaseIOSNode = memo(
  ({
    id,
    icon: Icon,
    name,
    description,
    children,
    status = "initial",
    category,
    onSettings,
    onDoubleClick,
  }: BaseIOSNodeProps) => {
    const { setNodes, setEdges } = useReactFlow();

    const handleDelete = () => {
      setNodes((currentNodes) => {
        const updatedNodes = currentNodes.filter((node) => node.id !== id);
        return updatedNodes;
      });

      setEdges((currentEdges) => {
        const updatedEdges = currentEdges.filter(
          (edge) => edge.source !== id && edge.target !== id
        );
        return updatedEdges;
      });
    };

    const categoryClass = category ? categoryColors[category] : "";

    return (
      <WorkflowNode
        name={name}
        description={description}
        onDelete={handleDelete}
        onSettings={onSettings}
      >
        <NodeStatusIndicator status={status} variant="border">
          <BaseNode
            status={status}
            onDoubleClick={onDoubleClick}
            className={categoryClass ? `border-l-4 ${categoryClass}` : undefined}
          >
            <BaseNodeContent>
              <Icon className="size-4 text-muted-foreground" />
              {children}
              <BaseHandle id="target-1" type="target" position={Position.Left} />
              <BaseHandle id="source-1" type="source" position={Position.Right} />
            </BaseNodeContent>
          </BaseNode>
        </NodeStatusIndicator>
      </WorkflowNode>
    );
  }
);

BaseIOSNode.displayName = "BaseIOSNode";
