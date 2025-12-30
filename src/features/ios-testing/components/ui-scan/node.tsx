"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Scan } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_UI_SCAN_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchUiScanRealtimeToken } from "./actions";
import { UiScanDialog, type UiScanFormValues } from "./dialog";

type UiScanNodeData = {
  variableName?: string;
  timeout?: string;
};

type UiScanNodeType = Node<UiScanNodeData>;

export const UiScanNode = memo((props: NodeProps<UiScanNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_UI_SCAN_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchUiScanRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: UiScanFormValues) => {
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
  const description = nodeData?.variableName
    ? `Output: ${nodeData.variableName}`
    : "Scan UI hierarchy";

  return (
    <>
      <UiScanDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Scan}
        name="UI Scan"
        status={nodeStatus}
        description={description}
        category="analysis"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

UiScanNode.displayName = "UiScanNode";
