"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_APP_UNINSTALL_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchAppUninstallRealtimeToken } from "./actions";
import { AppUninstallDialog, type AppUninstallFormValues } from "./dialog";

type AppUninstallNodeData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
};

type AppUninstallNodeType = Node<AppUninstallNodeData>;

export const AppUninstallNode = memo((props: NodeProps<AppUninstallNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_APP_UNINSTALL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchAppUninstallRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: AppUninstallFormValues) => {
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
  const description = nodeData?.bundleId
    ? `Bundle: ${nodeData.bundleId}`
    : "Not configured";

  return (
    <>
      <AppUninstallDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Trash2}
        name="App Uninstall"
        status={nodeStatus}
        description={description}
        category="simulator"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

AppUninstallNode.displayName = "AppUninstallNode";
