"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosAppLaunchChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type AppLaunchToken = Realtime.Token<
  typeof iosAppLaunchChannel,
  ["status"]
>;

export async function fetchAppLaunchRealtimeToken(): Promise<AppLaunchToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosAppLaunchChannel(),
    topics: ["status"],
  });

  return token;
}
