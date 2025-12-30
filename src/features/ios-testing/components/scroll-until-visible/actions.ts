"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosScrollUntilVisibleChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type ScrollUntilVisibleToken = Realtime.Token<
  typeof iosScrollUntilVisibleChannel,
  ["status"]
>;

export async function fetchScrollUntilVisibleRealtimeToken(): Promise<ScrollUntilVisibleToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosScrollUntilVisibleChannel(),
    topics: ["status"],
  });

  return token;
}
