"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosDeviceAppInstallChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type DeviceAppInstallToken = Realtime.Token<
  typeof iosDeviceAppInstallChannel,
  ["status"]
>;

export async function fetchDeviceAppInstallRealtimeToken(): Promise<DeviceAppInstallToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosDeviceAppInstallChannel(),
    topics: ["status"],
  });

  return token;
}
