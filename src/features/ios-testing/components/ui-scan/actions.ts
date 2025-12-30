"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosUiScanChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type UiScanToken = Realtime.Token<
  typeof iosUiScanChannel,
  ["status"]
>;

export async function fetchUiScanRealtimeToken(): Promise<UiScanToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosUiScanChannel(),
    topics: ["status"],
  });

  return token;
}
