"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Square } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_DEVICE_APP_TERMINATE_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchDeviceAppTerminateRealtimeToken } from "./actions";
import { DeviceAppTerminateDialog, type DeviceAppTerminateFormValues } from "./dialog";

type DeviceAppTerminateNodeData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
};

type DeviceAppTerminateNodeType = Node<DeviceAppTerminateNodeData>;

export const DeviceAppTerminateNode = memo((props: NodeProps<DeviceAppTerminateNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_DEVICE_APP_TERMINATE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchDeviceAppTerminateRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: DeviceAppTerminateFormValues) => {
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
      <DeviceAppTerminateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Square}
        name="Device App Terminate"
        status={nodeStatus}
        description={description}
        category="device"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

DeviceAppTerminateNode.displayName = "DeviceAppTerminateNode";
