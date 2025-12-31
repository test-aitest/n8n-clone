import type { NodeExecutor } from "@/features/executions/types";
import { scheduleTriggerChannel } from "@/inngest/channels/schedule-trigger";

type ScheduleTriggerData = {
  cronExpression?: string;
};

export const scheduleTriggerExecutor: NodeExecutor<ScheduleTriggerData> = async ({
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    scheduleTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  const result = await step.run("schedule-trigger", async () => ({
    ...context,
    triggeredAt: new Date().toISOString(),
    triggerType: "schedule",
  }));

  await publish(
    scheduleTriggerChannel().status({
      nodeId,
      status: "success",
    })
  );

  return result;
};
