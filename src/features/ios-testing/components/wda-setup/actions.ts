"use server";

import { exec } from "child_process";
import { promisify } from "util";
import { getSubscriptionToken, type Realtime } from "@inngest/realtime";
import { iosWdaSetupChannel } from "@/inngest/channels/ios-testing";
import { inngest } from "@/inngest/client";

const execAsync = promisify(exec);

export type WdaSetupToken = Realtime.Token<
  typeof iosWdaSetupChannel,
  ["status"]
>;

export async function fetchWdaSetupRealtimeToken(): Promise<WdaSetupToken> {
  const token = await getSubscriptionToken(inngest, {
    channel: iosWdaSetupChannel(),
    topics: ["status"],
  });

  return token;
}

export type XcodeTeam = {
  teamId: string;
  name: string;
  email: string;
  type: "personal" | "organization";
};

export async function fetchXcodeTeams(): Promise<XcodeTeam[]> {
  const teams: XcodeTeam[] = [];

  try {
    const { stdout } = await execAsync(
      "defaults read com.apple.dt.Xcode IDEProvisioningTeams 2>/dev/null"
    );

    // Parse plist output - format is:
    // { "email@example.com" = ({ teamID = XXXXX; teamName = "Name"; teamType = "Personal Team"; }); }
    const emailMatches = stdout.matchAll(/"([^"]+@[^"]+)"\s*=\s*\(/g);
    for (const emailMatch of emailMatches) {
      const email = emailMatch[1];

      // Find all teams for this email
      const teamRegex = /teamID\s*=\s*([A-Z0-9]+);[^}]*teamName\s*=\s*"([^"]+)";[^}]*teamType\s*=\s*"([^"]+)";/g;
      let teamMatch;
      while ((teamMatch = teamRegex.exec(stdout)) !== null) {
        const teamId = teamMatch[1];
        const teamName = teamMatch[2];
        const teamType = teamMatch[3];

        // Avoid duplicates
        if (!teams.find((t) => t.teamId === teamId)) {
          teams.push({
            teamId,
            name: teamName,
            email,
            type: teamType.includes("Personal") ? "personal" : "organization",
          });
        }
      }
    }
  } catch {
    console.log("[fetchXcodeTeams] No Xcode teams found. Please add an Apple ID in Xcode Settings → Accounts.");
  }

  return teams;
}
