"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_DEVICE_APP_UNINSTALL_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchDeviceAppUninstallRealtimeToken } from "./actions";
import { DeviceAppUninstallDialog, type DeviceAppUninstallFormValues } from "./dialog";

type DeviceAppUninstallNodeData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
};

type DeviceAppUninstallNodeType = Node<DeviceAppUninstallNodeData>;

export const DeviceAppUninstallNode = memo((props: NodeProps<DeviceAppUninstallNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_DEVICE_APP_UNINSTALL_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchDeviceAppUninstallRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: DeviceAppUninstallFormValues) => {
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
  const description = nodeData?.bundleId || "No bundle ID set";

  return (
    <>
      <DeviceAppUninstallDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Trash2}
        name="Device App Uninstall"
        status={nodeStatus}
        description={description}
        category="device"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

DeviceAppUninstallNode.displayName = "DeviceAppUninstallNode";
