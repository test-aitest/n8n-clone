"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Download } from "lucide-react";
import { memo, useState } from "react";
import { BaseIOSNode } from "../base-ios-node";
import { AppInstallDialog, type AppInstallFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchAppInstallRealtimeToken } from "./actions";
import { IOS_APP_INSTALL_CHANNEL_NAME } from "@/inngest/channels/ios-testing";

type AppInstallNodeData = {
  variableName?: string;
  deviceId?: string;
  appPath?: string;
};

type AppInstallNodeType = Node<AppInstallNodeData>;

export const AppInstallNode = memo((props: NodeProps<AppInstallNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_APP_INSTALL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchAppInstallRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: AppInstallFormValues) => {
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
  const description = nodeData?.appPath
    ? `App: ${nodeData.appPath.split("/").pop()}`
    : "Not configured";

  return (
    <>
      <AppInstallDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Download}
        name="App Install"
        status={nodeStatus}
        description={description}
        category="simulator"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

AppInstallNode.displayName = "AppInstallNode";
