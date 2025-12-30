"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosAppTerminateChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type AppTerminateToken = Realtime.Token<
  typeof iosAppTerminateChannel,
  ["status"]
>;

export async function fetchAppTerminateRealtimeToken(): Promise<AppTerminateToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosAppTerminateChannel(),
    topics: ["status"],
  });

  return token;
}
