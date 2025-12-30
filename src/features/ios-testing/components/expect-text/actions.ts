"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosExpectTextChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type ExpectTextToken = Realtime.Token<
  typeof iosExpectTextChannel,
  ["status"]
>;

export async function fetchExpectTextRealtimeToken(): Promise<ExpectTextToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosExpectTextChannel(),
    topics: ["status"],
  });

  return token;
}
