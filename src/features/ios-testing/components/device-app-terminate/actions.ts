"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosDeviceAppTerminateChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type DeviceAppTerminateToken = Realtime.Token<
  typeof iosDeviceAppTerminateChannel,
  ["status"]
>;

export async function fetchDeviceAppTerminateRealtimeToken(): Promise<DeviceAppTerminateToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosDeviceAppTerminateChannel(),
    topics: ["status"],
  });

  return token;
}
