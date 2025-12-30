"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { ToggleLeft } from "lucide-react";
import { memo, useState } from "react";
import { BaseIOSNode } from "../base-ios-node";
import { ToggleSwitchDialog, type ToggleSwitchFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchToggleSwitchRealtimeToken } from "./actions";
import { IOS_TOGGLE_SWITCH_CHANNEL_NAME } from "@/inngest/channels/ios-testing";

type ToggleSwitchNodeData = {
  variableName?: string;
  accessibilityId?: string;
  targetState?: "toggle" | "on" | "off";
};

type ToggleSwitchNodeType = Node<ToggleSwitchNodeData>;

export const ToggleSwitchNode = memo((props: NodeProps<ToggleSwitchNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_TOGGLE_SWITCH_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchToggleSwitchRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: ToggleSwitchFormValues) => {
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
  const stateLabels = {
    toggle: "Toggle",
    on: "Set ON",
    off: "Set OFF",
  };
  const description = nodeData?.targetState
    ? stateLabels[nodeData.targetState]
    : "Not configured";

  return (
    <>
      <ToggleSwitchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={ToggleLeft}
        name="Toggle Switch"
        status={nodeStatus}
        description={description}
        category="interaction"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ToggleSwitchNode.displayName = "ToggleSwitchNode";
