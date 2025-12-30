"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosScreenshotChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type ScreenshotToken = Realtime.Token<
  typeof iosScreenshotChannel,
  ["status"]
>;

export async function fetchScreenshotRealtimeToken(): Promise<ScreenshotToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosScreenshotChannel(),
    topics: ["status"],
  });

  return token;
}
