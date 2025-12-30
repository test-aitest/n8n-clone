"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosExpectValueChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type ExpectValueToken = Realtime.Token<
  typeof iosExpectValueChannel,
  ["status"]
>;

export async function fetchExpectValueRealtimeToken(): Promise<ExpectValueToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosExpectValueChannel(),
    topics: ["status"],
  });

  return token;
}
