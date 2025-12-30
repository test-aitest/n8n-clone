"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosSimulatorShutdownChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type SimulatorShutdownToken = Realtime.Token<
  typeof iosSimulatorShutdownChannel,
  ["status"]
>;

export async function fetchSimulatorShutdownRealtimeToken(): Promise<SimulatorShutdownToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosSimulatorShutdownChannel(),
    topics: ["status"],
  });

  return token;
}
