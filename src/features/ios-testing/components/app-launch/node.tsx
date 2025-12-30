"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";
import { memo, useState } from "react";
import { BaseIOSNode } from "../base-ios-node";
import { AppLaunchDialog, type AppLaunchFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchAppLaunchRealtimeToken } from "./actions";
import { IOS_APP_LAUNCH_CHANNEL_NAME } from "@/inngest/channels/ios-testing";

type AppLaunchNodeData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
  args?: string;
};

type AppLaunchNodeType = Node<AppLaunchNodeData>;

export const AppLaunchNode = memo((props: NodeProps<AppLaunchNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_APP_LAUNCH_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchAppLaunchRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: AppLaunchFormValues) => {
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
  const description = nodeData?.bundleId
    ? `Bundle: ${nodeData.bundleId}`
    : "Not configured";

  return (
    <>
      <AppLaunchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Play}
        name="App Launch"
        status={nodeStatus}
        description={description}
        category="simulator"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

AppLaunchNode.displayName = "AppLaunchNode";
