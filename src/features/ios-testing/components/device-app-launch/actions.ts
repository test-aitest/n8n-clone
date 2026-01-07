"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosDeviceAppLaunchChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type DeviceAppLaunchToken = Realtime.Token<
  typeof iosDeviceAppLaunchChannel,
  ["status"]
>;

export async function fetchDeviceAppLaunchRealtimeToken(): Promise<DeviceAppLaunchToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosDeviceAppLaunchChannel(),
    topics: ["status"],
  });

  return token;
}
