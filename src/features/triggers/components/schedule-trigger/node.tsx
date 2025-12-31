"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { memo, useState } from "react";
import { BaseTriggerNode } from "../base-trigger-node";
import { Calendar } from "lucide-react";
import { ScheduleTriggerDialog, type ScheduleTriggerFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchScheduleTriggerRealtimeToken } from "./actions";
import { SCHEDULE_TRIGGER_CHANNEL_NAME } from "@/inngest/channels/schedule-trigger";

type ScheduleTriggerNodeData = {
  preset?: string;
  cronExpression?: string;
};

type ScheduleTriggerNodeType = Node<ScheduleTriggerNodeData>;

export const ScheduleTriggerNode = memo((props: NodeProps<ScheduleTriggerNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: SCHEDULE_TRIGGER_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchScheduleTriggerRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: ScheduleTriggerFormValues) => {
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
  const getScheduleDescription = () => {
    if (!nodeData?.preset) return "Not configured";
    if (nodeData.preset === "custom") {
      return nodeData.cronExpression || "Custom schedule";
    }
    const presets: Record<string, string> = {
      "0 * * * *": "Every hour",
      "0 0 * * *": "Daily at midnight",
      "0 9 * * *": "Daily at 9:00 AM",
      "0 0 * * 1": "Weekly on Monday",
      "0 0 1 * *": "Monthly",
    };
    return presets[nodeData.preset] || nodeData.preset;
  };

  return (
    <>
      <ScheduleTriggerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseTriggerNode
        {...props}
        icon={Calendar}
        name="Schedule (Cron)"
        description={getScheduleDescription()}
        status={nodeStatus}
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ScheduleTriggerNode.displayName = "ScheduleTriggerNode";
