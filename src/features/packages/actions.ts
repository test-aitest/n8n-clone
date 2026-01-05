"use server";

import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { packageExecutionChannel } from "@/inngest/channels/package-execution";
import { inngest } from "@/inngest/client";

export type PackageExecutionToken = Realtime.Token<
  typeof packageExecutionChannel,
  ["status"]
>;

export async function fetchPackageExecutionRealtimeToken(): Promise<PackageExecutionToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: packageExecutionChannel(),
    topics: ["status"],
  });

  return token;
}
