import { channel, topic } from "@inngest/realtime";

export const INTERVAL_TRIGGER_CHANNEL_NAME = "interval-trigger-execution";

export const intervalTriggerChannel = channel(INTERVAL_TRIGGER_CHANNEL_NAME).addTopic(
  topic("status").type<{
    nodeId: string;
    status: "loading" | "success" | "error";
  }>()
);
