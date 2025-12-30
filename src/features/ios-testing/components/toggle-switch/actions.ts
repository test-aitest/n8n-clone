"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosToggleSwitchChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type ToggleSwitchToken = Realtime.Token<
  typeof iosToggleSwitchChannel,
  ["status"]
>;

export async function fetchToggleSwitchRealtimeToken(): Promise<ToggleSwitchToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosToggleSwitchChannel(),
    topics: ["status"],
  });

  return token;
}
