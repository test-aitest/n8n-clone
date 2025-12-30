"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { FileText } from "lucide-react";
import { memo, useState } from "react";
import { BaseIOSNode } from "../base-ios-node";
import { ExpectTextDialog, type ExpectTextFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchExpectTextRealtimeToken } from "./actions";
import { IOS_EXPECT_TEXT_CHANNEL_NAME } from "@/inngest/channels/ios-testing";

type ExpectTextNodeData = {
  variableName?: string;
  accessibilityId?: string;
  expectedText?: string;
  matchType?: "exact" | "contains" | "regex";
  timeout?: string;
};

type ExpectTextNodeType = Node<ExpectTextNodeData>;

export const ExpectTextNode = memo((props: NodeProps<ExpectTextNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_EXPECT_TEXT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchExpectTextRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: ExpectTextFormValues) => {
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
  const description = nodeData?.accessibilityId && nodeData?.expectedText
    ? `${nodeData.accessibilityId}: "${nodeData.expectedText.slice(0, 15)}${nodeData.expectedText.length > 15 ? "..." : ""}"`
    : "Not configured";

  return (
    <>
      <ExpectTextDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={FileText}
        name="Expect Text"
        status={nodeStatus}
        description={description}
        category="expect"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

ExpectTextNode.displayName = "ExpectTextNode";
