"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Play } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_DEVICE_APP_LAUNCH_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchDeviceAppLaunchRealtimeToken } from "./actions";
import { DeviceAppLaunchDialog, type DeviceAppLaunchFormValues } from "./dialog";

type DeviceAppLaunchNodeData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
};

type DeviceAppLaunchNodeType = Node<DeviceAppLaunchNodeData>;

export const DeviceAppLaunchNode = memo((props: NodeProps<DeviceAppLaunchNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_DEVICE_APP_LAUNCH_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchDeviceAppLaunchRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: DeviceAppLaunchFormValues) => {
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
      <DeviceAppLaunchDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Play}
        name="Device App Launch"
        status={nodeStatus}
        description={description}
        category="device"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

DeviceAppLaunchNode.displayName = "DeviceAppLaunchNode";
