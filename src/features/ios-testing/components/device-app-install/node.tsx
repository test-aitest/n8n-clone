"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Download } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_DEVICE_APP_INSTALL_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchDeviceAppInstallRealtimeToken } from "./actions";
import { DeviceAppInstallDialog, type DeviceAppInstallFormValues } from "./dialog";

type DeviceAppInstallNodeData = {
  variableName?: string;
  deviceId?: string;
  scheme?: string;
};

type DeviceAppInstallNodeType = Node<DeviceAppInstallNodeData>;

export const DeviceAppInstallNode = memo((props: NodeProps<DeviceAppInstallNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_DEVICE_APP_INSTALL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchDeviceAppInstallRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: DeviceAppInstallFormValues) => {
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
  const description = nodeData?.scheme
    ? `Scheme: ${nodeData.scheme}`
    : "Auto-detect scheme";

  return (
    <>
      <DeviceAppInstallDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Download}
        name="Device App Install"
        status={nodeStatus}
        description={description}
        category="device"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

DeviceAppInstallNode.displayName = "DeviceAppInstallNode";
