"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosAppUninstallChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type AppUninstallToken = Realtime.Token<
  typeof iosAppUninstallChannel,
  ["status"]
>;

export async function fetchAppUninstallRealtimeToken(): Promise<AppUninstallToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosAppUninstallChannel(),
    topics: ["status"],
  });

  return token;
}
