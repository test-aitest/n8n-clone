import type { NodeExecutor } from "@/features/executions/types";
import { intervalTriggerChannel } from "@/inngest/channels/interval-trigger";

type IntervalTriggerData = {
  delay?: string;
  unit?: "seconds" | "minutes" | "hours";
};

export const intervalTriggerExecutor: NodeExecutor<IntervalTriggerData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    intervalTriggerChannel().status({
      nodeId,
      status: "loading",
    })
  );

  // Calculate delay in milliseconds
  const delayValue = parseInt(data.delay || "10", 10);
  const unit = data.unit || "seconds";

  let delayMs = delayValue * 1000; // default: seconds
  if (unit === "minutes") delayMs = delayValue * 60 * 1000;
  if (unit === "hours") delayMs = delayValue * 60 * 60 * 1000;

  // Wait for the specified delay
  await step.sleep("delay-wait", delayMs);

  const result = await step.run("delay-trigger", async () => ({
    ...context,
    triggeredAt: new Date().toISOString(),
    triggerType: "delay",
    delayApplied: {
      value: delayValue,
      unit,
      milliseconds: delayMs,
    },
  }));

  await publish(
    intervalTriggerChannel().status({
      nodeId,
      status: "success",
    })
  );

  return result;
};
