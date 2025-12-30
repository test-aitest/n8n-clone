import { NonRetriableError } from "inngest";
import type { NodeExecutor } from "@/features/executions/types";
import { iosUiScanChannel } from "@/inngest/channels/ios-testing";
import * as idb from "@/lib/ios/idb";

type UiScanData = {
  variableName?: string;
  timeout?: string;
};

export const uiScanExecutor: NodeExecutor<UiScanData> = async ({
  data,
  nodeId,
  context,
  step,
  publish,
}) => {
  await publish(
    iosUiScanChannel().status({
      nodeId,
      status: "loading",
    }),
  );

  try {
    const result = await step.run("ui-scan", async () => {
      if (!data.variableName) {
        throw new NonRetriableError("UI Scan: Variable name is required");
      }

      // Get device ID from context (should be set by simulator boot node)
      const simulator = context.simulator as { deviceId?: string } | undefined;
      const deviceId =
        simulator?.deviceId || (context.deviceId as string | undefined);
      if (!deviceId) {
        throw new NonRetriableError(
          "UI Scan: No device ID found. Make sure simulator is booted first.",
        );
      }

      // Get the complete UI hierarchy
      const hierarchy = await idb.describeAll(deviceId);

      // Count elements for summary
      const countElements = (
        elements: typeof hierarchy.elements,
      ): { total: number; byRole: Record<string, number> } => {
        let total = 0;
        const byRole: Record<string, number> = {};

        const traverse = (els: typeof hierarchy.elements) => {
          for (const el of els) {
            total++;
            const role = el.AXRole || "Unknown";
            byRole[role] = (byRole[role] || 0) + 1;
            if (el.AXChildren) {
              traverse(el.AXChildren);
            }
          }
        };

        traverse(elements);
        return { total, byRole };
      };

      const stats = countElements(hierarchy.elements);

      // Extract accessibility identifiers for easy reference
      const extractAccessibilityIds = (
        elements: typeof hierarchy.elements,
      ): string[] => {
        const ids: string[] = [];

        const traverse = (els: typeof hierarchy.elements) => {
          for (const el of els) {
            if (el.AXIdentifier) {
              ids.push(el.AXIdentifier);
            }
            if (el.AXChildren) {
              traverse(el.AXChildren);
            }
          }
        };

        traverse(elements);
        return ids;
      };

      const accessibilityIds = extractAccessibilityIds(hierarchy.elements);

      return {
        ...context,
        [data.variableName]: {
          success: true,
          hierarchy: hierarchy.elements,
          timestamp: hierarchy.timestamp,
          stats: {
            totalElements: stats.total,
            elementsByRole: stats.byRole,
            accessibilityIds,
          },
        },
      };
    });

    await publish(
      iosUiScanChannel().status({
        nodeId,
        status: "success",
      }),
    );

    return result;
  } catch (error) {
    await publish(
      iosUiScanChannel().status({
        nodeId,
        status: "error",
      }),
    );
    throw error;
  }
};
