"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Camera } from "lucide-react";
import { memo, useState } from "react";
import { BaseIOSNode } from "../base-ios-node";
import { ScreenshotDialog, type ScreenshotFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchScreenshotRealtimeToken } from "./actions";
import { IOS_SCREENSHOT_CHANNEL_NAME } from "@/inngest/channels/ios-testing";

type ScreenshotNodeData = {
  variableName?: string;
  filename?: string;
};

type ScreenshotNodeType = Node<ScreenshotNodeData>;

export const ScreenshotNode = memo((props: NodeProps<ScreenshotNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_SCREENSHOT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchScreenshotRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: ScreenshotFormValues) => {
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
  const description = nodeData?.filename
    ? `Save as: ${nodeData.filename}`
    : "Auto-named";

  return (
    <>
      <ScreenshotDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Camera}
        name="Screenshot"
        status={nodeStatus}
        description={description}
        category="interaction"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ScreenshotNode.displayName = "ScreenshotNode";
