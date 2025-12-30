"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosSimulatorBootChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type SimulatorBootToken = Realtime.Token<
  typeof iosSimulatorBootChannel,
  ["status"]
>;

export async function fetchSimulatorBootRealtimeToken(): Promise<SimulatorBootToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosSimulatorBootChannel(),
    topics: ["status"],
  });

  return token;
}
