"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Move } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_SWIPE_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchSwipeRealtimeToken } from "./actions";
import { SwipeDialog, type SwipeFormValues } from "./dialog";

type SwipeNodeData = {
  variableName?: string;
  direction?: "up" | "down" | "left" | "right";
  distance?: string;
};

type SwipeNodeType = Node<SwipeNodeData>;

export const SwipeNode = memo((props: NodeProps<SwipeNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_SWIPE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSwipeRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: SwipeFormValues) => {
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
      }),
    );
  };

  const nodeData = props.data;
  const description = nodeData?.direction
    ? `Swipe ${nodeData.direction}`
    : "Not configured";

  return (
    <>
      <SwipeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Move}
        name="Swipe"
        status={nodeStatus}
        description={description}
        category="interaction"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

SwipeNode.displayName = "SwipeNode";
