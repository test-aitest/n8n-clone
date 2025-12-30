"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { CheckCircle } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_EXPECT_EXISTS_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchExpectExistsRealtimeToken } from "./actions";
import { ExpectExistsDialog, type ExpectExistsFormValues } from "./dialog";

type ExpectExistsNodeData = {
  variableName?: string;
  accessibilityId?: string;
  timeout?: string;
};

type ExpectExistsNodeType = Node<ExpectExistsNodeData>;

export const ExpectExistsNode = memo(
  (props: NodeProps<ExpectExistsNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: IOS_EXPECT_EXISTS_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchExpectExistsRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: ExpectExistsFormValues) => {
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
    const description = nodeData?.accessibilityId
      ? `Check: ${nodeData.accessibilityId}`
      : "Not configured";

    return (
      <>
        <ExpectExistsDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseIOSNode
          {...props}
          id={props.id}
          icon={CheckCircle}
          name="Expect Exists"
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

ExpectExistsNode.displayName = "ExpectExistsNode";
