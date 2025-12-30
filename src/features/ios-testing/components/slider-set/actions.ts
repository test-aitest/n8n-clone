"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosSliderSetChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type SliderSetToken = Realtime.Token<
  typeof iosSliderSetChannel,
  ["status"]
>;

export async function fetchSliderSetRealtimeToken(): Promise<SliderSetToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosSliderSetChannel(),
    topics: ["status"],
  });

  return token;
}
