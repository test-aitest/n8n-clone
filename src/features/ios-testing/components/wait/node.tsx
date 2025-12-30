"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";
import { memo, useState } from "react";
import { BaseIOSNode } from "../base-ios-node";
import { WaitDialog, type WaitFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchWaitRealtimeToken } from "./actions";
import { IOS_WAIT_CHANNEL_NAME } from "@/inngest/channels/ios-testing";

type WaitNodeData = {
  variableName?: string;
  waitType?: "duration" | "element";
  duration?: string;
  accessibilityId?: string;
  timeout?: string;
};

type WaitNodeType = Node<WaitNodeData>;

export const WaitNode = memo((props: NodeProps<WaitNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_WAIT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWaitRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: WaitFormValues) => {
    setNodes((nodes) =>
      nodes.map((node) => {
        if (node.id === props.id) {
          return {
            ...node,
            data: {
              ...node.data,
              ...values,
            },
          };
        }
        return node;
      })
    );
  };

  const nodeData = props.data;
  let description = "Not configured";
  if (nodeData?.waitType === "duration" && nodeData.duration) {
    const ms = parseInt(nodeData.duration, 10);
    description = ms >= 1000 ? `Wait ${ms / 1000}s` : `Wait ${ms}ms`;
  } else if (nodeData?.waitType === "element" && nodeData.accessibilityId) {
    description = `Until: ${nodeData.accessibilityId}`;
  }

  return (
    <>
      <WaitDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Clock}
        name="Wait"
        status={nodeStatus}
        description={description}
        category="interaction"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

WaitNode.displayName = "WaitNode";
