"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosExpectVisualChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type ExpectVisualToken = Realtime.Token<
  typeof iosExpectVisualChannel,
  ["status"]
>;

export async function fetchExpectVisualRealtimeToken(): Promise<ExpectVisualToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosExpectVisualChannel(),
    topics: ["status"],
  });

  return token;
}
