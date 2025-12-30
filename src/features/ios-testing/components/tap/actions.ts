"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosTapChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type TapToken = Realtime.Token<typeof iosTapChannel, ["status"]>;

export async function fetchTapRealtimeToken(): Promise<TapToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosTapChannel(),
    topics: ["status"],
  });

  return token;
}
