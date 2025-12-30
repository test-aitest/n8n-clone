"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosTextInputChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type TextInputToken = Realtime.Token<
  typeof iosTextInputChannel,
  ["status"]
>;

export async function fetchTextInputRealtimeToken(): Promise<TextInputToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosTextInputChannel(),
    topics: ["status"],
  });

  return token;
}
