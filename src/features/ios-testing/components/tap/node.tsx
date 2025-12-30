"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { MousePointerClick } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_TAP_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchTapRealtimeToken } from "./actions";
import { TapDialog, type TapFormValues } from "./dialog";

type TapNodeData = {
  variableName?: string;
  accessibilityId?: string;
  timeout?: string;
};

type TapNodeType = Node<TapNodeData>;

export const TapNode = memo((props: NodeProps<TapNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_TAP_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchTapRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: TapFormValues) => {
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
  const description = nodeData?.accessibilityId
    ? `Tap: ${nodeData.accessibilityId}`
    : "Not configured";

  return (
    <>
      <TapDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={MousePointerClick}
        name="Tap"
        status={nodeStatus}
        description={description}
        category="interaction"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

TapNode.displayName = "TapNode";
