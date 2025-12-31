"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { Timer } from "lucide-react";
import { IntervalTriggerDialog, type IntervalTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchIntervalTriggerRealtimeToken } from "./actions";
import { INTERVAL_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/interval-trigger";

type IntervalTriggerNodeData = {
  delay?: string;
  unit?: "seconds" | "minutes" | "hours";
};

type IntervalTriggerNodeType = Node<IntervalTriggerNodeData>;

export const IntervalTriggerNode = memo((props: NodeProps<IntervalTriggerNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: INTERVAL_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchIntervalTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: IntervalTriggerFormValues) => {
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
  const getDelayDescription = () => {
    if (!nodeData?.delay) return "Not configured";
    return `Wait ${nodeData.delay} ${nodeData.unit || "seconds"}`;
  };

  return (
    <>
      <IntervalTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseTriggerNode
        {...props}
        icon={Timer}
        name="Delay Trigger"
        description={getDelayDescription()}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

IntervalTriggerNode.displayName = "IntervalTriggerNode";
