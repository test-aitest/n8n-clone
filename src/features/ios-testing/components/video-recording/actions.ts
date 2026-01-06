"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosVideoRecordingChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type VideoRecordingToken = Realtime.Token<
  typeof iosVideoRecordingChannel,
  ["status"]
>;

export async function fetchVideoRecordingRealtimeToken(): Promise<VideoRecordingToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosVideoRecordingChannel(),
    topics: ["status"],
  });

  return token;
}
