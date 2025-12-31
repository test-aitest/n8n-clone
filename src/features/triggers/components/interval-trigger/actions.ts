"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { intervalTriggerChannel } from "@/inngest/channels/interval-trigger";
import { inngest } from "@/inngest/client";

export type IntervalTriggerToken = Realtime.Token<
  typeof intervalTriggerChannel,
  ["status"]
>;

export async function fetchIntervalTriggerRealtimeToken(): Promise<IntervalTriggerToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: intervalTriggerChannel(),
    topics: ["status"],
  });

  return token;
}
