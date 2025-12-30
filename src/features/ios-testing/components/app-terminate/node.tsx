"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Square } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_APP_TERMINATE_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchAppTerminateRealtimeToken } from "./actions";
import { AppTerminateDialog, type AppTerminateFormValues } from "./dialog";

type AppTerminateNodeData = {
  variableName?: string;
  deviceId?: string;
  bundleId?: string;
};

type AppTerminateNodeType = Node<AppTerminateNodeData>;

export const AppTerminateNode = memo(
  (props: NodeProps<AppTerminateNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: IOS_APP_TERMINATE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchAppTerminateRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: AppTerminateFormValues) => {
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
        <AppTerminateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseIOSNode
          {...props}
          id={props.id}
          icon={Square}
          name="App Terminate"
          status={nodeStatus}
          description={description}
          category="simulator"
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

AppTerminateNode.displayName = "AppTerminateNode";
