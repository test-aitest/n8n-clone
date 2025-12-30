"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { ChevronsDown } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_SCROLL_UNTIL_VISIBLE_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchScrollUntilVisibleRealtimeToken } from "./actions";
import {
  ScrollUntilVisibleDialog,
  type ScrollUntilVisibleFormValues,
} from "./dialog";

type ScrollUntilVisibleNodeData = {
  variableName?: string;
  accessibilityId?: string;
  direction?: "up" | "down";
  maxScrolls?: string;
};

type ScrollUntilVisibleNodeType = Node<ScrollUntilVisibleNodeData>;

export const ScrollUntilVisibleNode = memo(
  (props: NodeProps<ScrollUntilVisibleNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: IOS_SCROLL_UNTIL_VISIBLE_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchScrollUntilVisibleRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: ScrollUntilVisibleFormValues) => {
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
      ? `Find: ${nodeData.accessibilityId}`
      : "Not configured";

    return (
      <>
        <ScrollUntilVisibleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseIOSNode
          {...props}
          id={props.id}
          icon={ChevronsDown}
          name="Scroll Until Visible"
          status={nodeStatus}
          description={description}
          category="interaction"
          onSettings={handleOpenSettings}
          onDoubleClick={handleOpenSettings}
        />
      </>
    );
  },
);

ScrollUntilVisibleNode.displayName = "ScrollUntilVisibleNode";
