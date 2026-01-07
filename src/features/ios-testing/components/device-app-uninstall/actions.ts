"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosDeviceAppUninstallChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

export type DeviceAppUninstallToken = Realtime.Token<
  typeof iosDeviceAppUninstallChannel,
  ["status"]
>;

export async function fetchDeviceAppUninstallRealtimeToken(): Promise<DeviceAppUninstallToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosDeviceAppUninstallChannel(),
    topics: ["status"],
  });

  return token;
}
