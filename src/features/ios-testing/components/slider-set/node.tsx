"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { SlidersHorizontal } from "lucide-react";
import { memo, useState } from "react";
import { BaseIOSNode } from "../base-ios-node";
import { SliderSetDialog, type SliderSetFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchSliderSetRealtimeToken } from "./actions";
import { IOS_SLIDER_SET_CHANNEL_NAME } from "@/inngest/channels/ios-testing";

type SliderSetNodeData = {
  variableName?: string;
  accessibilityId?: string;
  value?: number;
};

type SliderSetNodeType = Node<SliderSetNodeData>;

export const SliderSetNode = memo((props: NodeProps<SliderSetNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_SLIDER_SET_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchSliderSetRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: SliderSetFormValues) => {
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
  const description = nodeData?.value !== undefined
    ? `Set to ${Math.round(nodeData.value * 100)}%`
    : "Not configured";

  return (
    <>
      <SliderSetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={SlidersHorizontal}
        name="Slider Set"
        status={nodeStatus}
        description={description}
        category="interaction"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

SliderSetNode.displayName = "SliderSetNode";
