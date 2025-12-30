"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosPickerSelectChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type PickerSelectToken = Realtime.Token<
  typeof iosPickerSelectChannel,
  ["status"]
>;

export async function fetchPickerSelectRealtimeToken(): Promise<PickerSelectToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosPickerSelectChannel(),
    topics: ["status"],
  });

  return token;
}
