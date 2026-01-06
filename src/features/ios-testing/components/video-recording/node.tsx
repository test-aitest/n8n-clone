"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Video } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_VIDEO_RECORDING_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchVideoRecordingRealtimeToken } from "./actions";
import { VideoRecordingDialog, type VideoRecordingFormValues } from "./dialog";

type VideoRecordingNodeData = {
  variableName?: string;
  filename?: string;
};

type VideoRecordingNodeType = Node<VideoRecordingNodeData>;

export const VideoRecordingNode = memo((props: NodeProps<VideoRecordingNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_VIDEO_RECORDING_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchVideoRecordingRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: VideoRecordingFormValues) => {
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
  const description = nodeData?.filename
    ? `File: ${nodeData.filename}`
    : "Auto-stop on workflow end";

  return (
    <>
      <VideoRecordingDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Video}
        name="Video Recording"
        status={nodeStatus}
        description={description}
        category="simulator"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

VideoRecordingNode.displayName = "VideoRecordingNode";
