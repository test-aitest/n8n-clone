"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosAppInstallChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type AppInstallToken = Realtime.Token<
  typeof iosAppInstallChannel,
  ["status"]
>;

export async function fetchAppInstallRealtimeToken(): Promise<AppInstallToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosAppInstallChannel(),
    topics: ["status"],
  });

  return token;
}
