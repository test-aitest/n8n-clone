"use client";

import { type Node, type NodeProps, useReactFlow } from "@xyflow/react";
import { Power } from "lucide-react";
import { memo, useState } from "react";
import { useNodeStatus } from "@/features/executions/hooks/use-node-status";
import { IOS_SIMULATOR_SHUTDOWN_CHANNEL_NAME } from "@/inngest/channels/ios-testing";
import { BaseIOSNode } from "../base-ios-node";
import { fetchSimulatorShutdownRealtimeToken } from "./actions";
import {
  SimulatorShutdownDialog,
  type SimulatorShutdownFormValues,
} from "./dialog";

type SimulatorShutdownNodeData = {
  variableName?: string;
  deviceId?: string;
};

type SimulatorShutdownNodeType = Node<SimulatorShutdownNodeData>;

export const SimulatorShutdownNode = memo(
  (props: NodeProps<SimulatorShutdownNodeType>) => {
    const [dialogOpen, setDialogOpen] = useState(false);
    const { setNodes } = useReactFlow();

    const nodeStatus = useNodeStatus({
      nodeId: props.id,
      channel: IOS_SIMULATOR_SHUTDOWN_CHANNEL_NAME,
      topic: "status",
      refreshToken: fetchSimulatorShutdownRealtimeToken,
    });

    const handleOpenSettings = () => setDialogOpen(true);

    const handleSubmit = (values: SimulatorShutdownFormValues) => {
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
        <SimulatorShutdownDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSubmit={handleSubmit}
          defaultValues={nodeData}
        />
        <BaseIOSNode
          {...props}
          id={props.id}
          icon={Power}
          name="Simulator Shutdown"
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

SimulatorShutdownNode.displayName = "SimulatorShutdownNode";
