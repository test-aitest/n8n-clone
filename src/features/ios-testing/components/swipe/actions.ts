"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosSwipeChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type SwipeToken = Realtime.Token<
  typeof iosSwipeChannel,
  ["status"]
>;

export async function fetchSwipeRealtimeToken(): Promise<SwipeToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosSwipeChannel(),
    topics: ["status"],
  });

  return token;
}
