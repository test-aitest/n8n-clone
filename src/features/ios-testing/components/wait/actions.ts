"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosWaitChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type WaitToken = Realtime.Token<typeof iosWaitChannel, ["status"]>;

export async function fetchWaitRealtimeToken(): Promise<WaitToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosWaitChannel(),
    topics: ["status"],
  });

  return token;
}
