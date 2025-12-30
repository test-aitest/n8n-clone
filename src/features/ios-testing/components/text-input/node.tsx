"use client";

import { useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { Type } from "lucide-react";
import { memo, useState } from "react";
import { BaseIOSNode } from "../base-ios-node";
import { TextInputDialog, type TextInputFormValues } from "./dialog";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { fetchTextInputRealtimeToken } from "./actions";
import { IOS_TEXT_INPUT_CHANNEL_NAME } from "@/inngest/channels/ios-testing";

type TextInputNodeData = {
  variableName?: string;
  accessibilityId?: string;
  text?: string;
  clearFirst?: boolean;
};

type TextInputNodeType = Node<TextInputNodeData>;

export const TextInputNode = memo((props: NodeProps<TextInputNodeType>) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { setNodes } = useReactFlow();

  const nodeStatus = useNodeStatus({
    nodeId: props.id,
    channel: IOS_TEXT_INPUT_CHANNEL_NAME,
    topic: "status",
    refreshToken: fetchTextInputRealtimeToken,
  });

  const handleOpenSettings = () => setDialogOpen(true);

  const handleSubmit = (values: TextInputFormValues) => {
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
  const description = nodeData?.text
    ? `Type: "${nodeData.text.slice(0, 20)}${nodeData.text.length > 20 ? "..." : ""}"`
    : "Not configured";

  return (
    <>
      <TextInputDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
        defaultValues={nodeData}
      />
      <BaseIOSNode
        {...props}
        id={props.id}
        icon={Type}
        name="Text Input"
        status={nodeStatus}
        description={description}
        category="interaction"
        onSettings={handleOpenSettings}
        onDoubleClick={handleOpenSettings}
      />
    </>
  );
});

TextInputNode.displayName = "TextInputNode";
