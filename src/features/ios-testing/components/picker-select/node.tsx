"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { List } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_PICKER_SELECT_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchPickerSelectRealtimeToken } from "./actions";
import { PickerSelectDialog, type PickerSelectFormValues } from "./dialog";

type PickerSelectNodeData = {
  variableName?: string;
  accessibilityId?: string;
  value?: string;
};

type PickerSelectNodeType = Node<PickerSelectNodeData>;

export const PickerSelectNode = memo(
  (props: NodeProps<PickerSelectNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: IOS_PICKER_SELECT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchPickerSelectRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: PickerSelectFormValues) => {
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
    const description = nodeData?.value
      ? `Select: ${nodeData.value}`
      : "Not configured";

    return (
      <>
        <PickerSelectDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseIOSNode
          {...props}
          id={props.id}
          icon={List}
          name="Picker Select"
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

PickerSelectNode.displayName = "PickerSelectNode";
