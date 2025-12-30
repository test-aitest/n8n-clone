"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Smartphone } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_SIMULATOR_BOOT_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchSimulatorBootRealtimeToken } from "./actions";
import { SimulatorBootDialog, type SimulatorBootFormValues } from "./dialog";

type SimulatorBootNodeData = {
  variableName?: string;
  deviceId?: string;
  timeout?: string;
};

type SimulatorBootNodeType = Node<SimulatorBootNodeData>;

export const SimulatorBootNode = memo(
  (props: NodeProps<SimulatorBootNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: IOS_SIMULATOR_BOOT_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchSimulatorBootRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: SimulatorBootFormValues) => {
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
    const description = nodeData?.deviceId
      ? `Device: ${nodeData.deviceId.slice(0, 8)}...`
      : "Not configured";

    return (
      <>
        <SimulatorBootDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseIOSNode
          {...props}
          id={props.id}
          icon={Smartphone}
          name="Simulator Boot"
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

SimulatorBootNode.displayName = "SimulatorBootNode";
