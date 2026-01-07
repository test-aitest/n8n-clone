"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Settings } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_WDA_SETUP_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchWdaSetupRealtimeToken } from "./actions";
import { WdaSetupDialog, type WdaSetupFormValues } from "./dialog";

type WdaSetupNodeData = {
  variableName?: string;
  deviceId?: string;
  teamId?: string;
  signingId?: string;
};

type WdaSetupNodeType = Node<WdaSetupNodeData>;

export const WdaSetupNode = memo((props: NodeProps<WdaSetupNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_WDA_SETUP_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchWdaSetupRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: WdaSetupFormValues) => {
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
  const description = nodeData?.deviceId
    ? `Device: ${nodeData.deviceId.substring(0, 8)}...`
    : "Configure WDA for device";

  return (
    <>
      <WdaSetupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Settings}
        name="WDA Setup"
        status={nodeStatus}
        description={description}
        category="device"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

WdaSetupNode.displayName = "WdaSetupNode";
