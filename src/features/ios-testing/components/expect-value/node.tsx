"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Hash } from "lucide-react";
import { memo, useState } from "react";
import { BaseIOSNode } from "../base-ios-node";
import { ExpectValueDialog, type ExpectValueFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchExpectValueRealtimeToken } from "./actions";
import { IOS_EXPECT_VALUE_CHANNEL_NAME } from "@/inngest/channels/ios-testing";

type ExpectValueNodeData = {
  variableName?: string;
  accessibilityId?: string;
  expectedValue?: string;
  timeout?: string;
};

type ExpectValueNodeType = Node<ExpectValueNodeData>;

export const ExpectValueNode = memo((props: NodeProps<ExpectValueNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_EXPECT_VALUE_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchExpectValueRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: ExpectValueFormValues) => {
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
  const description = nodeData?.accessibilityId && nodeData?.expectedValue
    ? `${nodeData.accessibilityId}: "${nodeData.expectedValue.slice(0, 15)}${nodeData.expectedValue.length > 15 ? "..." : ""}"`
    : "Not configured";

  return (
    <>
      <ExpectValueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Hash}
        name="Expect Value"
        status={nodeStatus}
        description={description}
        category="expect"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ExpectValueNode.displayName = "ExpectValueNode";
