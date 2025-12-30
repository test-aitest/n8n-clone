"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosExpectExistsChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type ExpectExistsToken = Realtime.Token<
  typeof iosExpectExistsChannel,
  ["status"]
>;

export async function fetchExpectExistsRealtimeToken(): Promise<ExpectExistsToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosExpectExistsChannel(),
    topics: ["status"],
  });

  return token;
}
