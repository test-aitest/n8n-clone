"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Image } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_EXPECT_VISUAL_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchExpectVisualRealtimeToken } from "./actions";
import { ExpectVisualDialog, type ExpectVisualFormValues } from "./dialog";

type ExpectVisualNodeData = {
  variableName?: string;
  baselineImage?: string;
  threshold?: string;
  timeout?: string;
};

type ExpectVisualNodeType = Node<ExpectVisualNodeData>;

export const ExpectVisualNode = memo(
  (props: NodeProps<ExpectVisualNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: IOS_EXPECT_VISUAL_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchExpectVisualRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: ExpectVisualFormValues) => {
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
    const description = nodeData?.baselineImage
      ? `Baseline: ${nodeData.baselineImage.split("/").pop()}`
      : "Not configured";

    return (
      <>
        <ExpectVisualDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseIOSNode
          {...props}
          id={props.id}
          icon={Image}
          name="Expect Visual"
          status={nodeStatus}
          description={description}
          category="expect"
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

ExpectVisualNode.displayName = "ExpectVisualNode";
