"use client";

import { createId } from "@paralleldrive/cuid2";
import { useReactFlow } from "@xyflow/react";
import {
  GlobeIcon,
  MousePointerIcon,
  Smartphone,
  Power,
  Download,
  Play,
  Square,
  MousePointerClick,
  Type,
  Move,
  ChevronsDown,
  List,
  SlidersHorizontal,
  ToggleLeft,
  Camera,
  Clock,
  CheckCircle,
  FileText,
  Hash,
  Image,
  Scan,
  Calendar,
  Timer,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { NodeType } from "@/generated/prisma/browser";
import { Separator } from "./ui/separator";

export type NodeTypeOption = {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }> | string;
};

const triggerNodes: NodeTypeOption[] = [
  {
    type: NodeType.MANUAL_TRIGGER,
    label: "Trigger manually",
    description:
      "Runs the flow on clicking a button. Good for getting started quickly",
    icon: MousePointerIcon,
  },
  {
    type: NodeType.SCHEDULE_TRIGGER,
    label: "Schedule (Cron)",
    description: "Runs the flow on a schedule using cron expression",
    icon: Calendar,
  },
  {
    type: NodeType.INTERVAL_TRIGGER,
    label: "Delay Trigger",
    description: "Runs the flow after a specified delay (one-time execution)",
    icon: Timer,
  },
];

const executionNodes: NodeTypeOption[] = [
  {
    type: NodeType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Makes an HTTP request",
    icon: GlobeIcon,
  },
  {
    type: NodeType.GEMINI,
    label: "Gemini",
    description: "Uses Google Gemini to generate text",
    icon: "/logos/gemini.svg",
  },
  {
    type: NodeType.OPENAI,
    label: "OpenAI",
    description: "Uses OpenAI to generate text",
    icon: "/logos/openai.svg",
  },
  {
    type: NodeType.ANTHROPIC,
    label: "Anthropic",
    description: "Uses Anthropic to generate text",
    icon: "/logos/anthropic.svg",
  },
  {
    type: NodeType.DISCORD,
    label: "Discord",
    description: "Send a message to Discord",
    icon: "/logos/discord.svg",
  },
  {
    type: NodeType.SLACK,
    label: "Slack",
    description: "Send a message to Slack",
    icon: "/logos/slack.svg",
  },
];

// iOS Testing - Simulator Control
const iosSimulatorNodes: NodeTypeOption[] = [
  {
    type: NodeType.IOS_SIMULATOR_BOOT,
    label: "Simulator Boot",
    description: "Boot an iOS Simulator",
    icon: Smartphone,
  },
  {
    type: NodeType.IOS_SIMULATOR_SHUTDOWN,
    label: "Simulator Shutdown",
    description: "Shutdown an iOS Simulator",
    icon: Power,
  },
  {
    type: NodeType.IOS_APP_INSTALL,
    label: "App Install",
    description: "Install an app on Simulator",
    icon: Download,
  },
  {
    type: NodeType.IOS_APP_LAUNCH,
    label: "App Launch",
    description: "Launch an app on Simulator",
    icon: Play,
  },
  {
    type: NodeType.IOS_APP_TERMINATE,
    label: "App Terminate",
    description: "Terminate an app on Simulator",
    icon: Square,
  },
];

// iOS Testing - UI Interaction
const iosInteractionNodes: NodeTypeOption[] = [
  {
    type: NodeType.IOS_TAP,
    label: "Tap",
    description: "Tap on an element",
    icon: MousePointerClick,
  },
  {
    type: NodeType.IOS_TEXT_INPUT,
    label: "Text Input",
    description: "Enter text into a field",
    icon: Type,
  },
  {
    type: NodeType.IOS_SWIPE,
    label: "Swipe",
    description: "Swipe in a direction",
    icon: Move,
  },
  {
    type: NodeType.IOS_SCROLL_UNTIL_VISIBLE,
    label: "Scroll Until Visible",
    description: "Scroll until element is visible",
    icon: ChevronsDown,
  },
  {
    type: NodeType.IOS_PICKER_SELECT,
    label: "Picker Select",
    description: "Select a value in a picker",
    icon: List,
  },
  {
    type: NodeType.IOS_SLIDER_SET,
    label: "Slider Set",
    description: "Set a slider value",
    icon: SlidersHorizontal,
  },
  {
    type: NodeType.IOS_TOGGLE_SWITCH,
    label: "Toggle Switch",
    description: "Toggle a switch on/off",
    icon: ToggleLeft,
  },
  {
    type: NodeType.IOS_SCREENSHOT,
    label: "Screenshot",
    description: "Take a screenshot",
    icon: Camera,
  },
  {
    type: NodeType.IOS_WAIT,
    label: "Wait",
    description: "Wait for duration or element",
    icon: Clock,
  },
];

// iOS Testing - Expect/Validation
const iosExpectNodes: NodeTypeOption[] = [
  {
    type: NodeType.IOS_EXPECT_EXISTS,
    label: "Expect Exists",
    description: "Check if element exists",
    icon: CheckCircle,
  },
  {
    type: NodeType.IOS_EXPECT_TEXT,
    label: "Expect Text",
    description: "Check element text content",
    icon: FileText,
  },
  {
    type: NodeType.IOS_EXPECT_VALUE,
    label: "Expect Value",
    description: "Check element AXValue",
    icon: Hash,
  },
  {
    type: NodeType.IOS_EXPECT_VISUAL,
    label: "Expect Visual",
    description: "Visual regression check",
    icon: Image,
  },
];

// iOS Testing - Analysis
const iosAnalysisNodes: NodeTypeOption[] = [
  {
    type: NodeType.IOS_UI_SCAN,
    label: "UI Scan",
    description: "Scan UI hierarchy",
    icon: Scan,
  },
];

interface NodeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function NodeSelector({
  open,
  onOpenChange,
  children,
}: NodeSelectorProps) {
  const { setNodes, getNodes, screenToFlowPosition } = useReactFlow();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering Sheet after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNodeSelect = useCallback(
    (selection: NodeTypeOption) => {
      if (selection.type === NodeType.MANUAL_TRIGGER) {
        const nodes = getNodes();
        const hasManualTrigger = nodes.some(
          (node) => node.type === NodeType.MANUAL_TRIGGER
        );

        if (hasManualTrigger) {
          toast.error("Only one manual trigger is allowed per workflow");
          return;
        }
      }

      setNodes((nodes) => {
        const hasInitialTrigger = nodes.some(
          (node) => node.type === NodeType.INITIAL
        );

        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;

        const flowPosition = screenToFlowPosition({
          x: centerX + (Math.random() - 0.5) * 200,
          y: centerY + (Math.random() - 0.5) * 200,
        });

        const newNode = {
          id: createId(),
          data: {},
          position: flowPosition,
          type: selection.type,
        };

        if (hasInitialTrigger) {
          return [newNode];
        }

        return [...nodes, newNode];
      });

      onOpenChange(false);
    },
    [setNodes, getNodes, onOpenChange, screenToFlowPosition]
  );

  // Return children without Sheet wrapper during SSR to prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>What triggers this workflow?</SheetTitle>
          <SheetDescription>
            A trigger is a step that starts your workflow.
          </SheetDescription>
        </SheetHeader>
        <div>
          {triggerNodes.map((nodeType) => {
            const Icon = nodeType.icon;

            return (
              <div
                key={nodeType.type}
                className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                onClick={() => handleNodeSelect(nodeType)}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <img
                      src={Icon}
                      alt={nodeType.label}
                      className="size-5 object-contain rounded-sm"
                    />
                  ) : (
                    <Icon className="size-5" />
                  )}
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium text-sm">{nodeType.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {nodeType.description}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Separator />
        <div>
          {executionNodes.map((nodeType) => {
            const Icon = nodeType.icon;

            return (
              <div
                key={nodeType.type}
                className="w-full justify-start h-auto py-5 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-primary"
                onClick={() => handleNodeSelect(nodeType)}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <img
                      src={Icon}
                      alt={nodeType.label}
                      className="size-5 object-contain rounded-sm"
                    />
                  ) : (
                    <Icon className="size-5" />
                  )}
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium text-sm">{nodeType.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {nodeType.description}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Separator />
        <SheetHeader className="px-4 pt-4">
          <SheetTitle className="text-base">iOS Testing - Simulator</SheetTitle>
        </SheetHeader>
        <div>
          {iosSimulatorNodes.map((nodeType) => {
            const Icon = nodeType.icon;
            return (
              <div
                key={nodeType.type}
                className="w-full justify-start h-auto py-4 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-blue-500"
                onClick={() => handleNodeSelect(nodeType)}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <img src={Icon} alt={nodeType.label} className="size-5 object-contain rounded-sm" />
                  ) : (
                    <Icon className="size-5 text-blue-500" />
                  )}
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium text-sm">{nodeType.label}</span>
                    <span className="text-xs text-muted-foreground">{nodeType.description}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Separator />
        <SheetHeader className="px-4 pt-4">
          <SheetTitle className="text-base">iOS Testing - Interaction</SheetTitle>
        </SheetHeader>
        <div>
          {iosInteractionNodes.map((nodeType) => {
            const Icon = nodeType.icon;
            return (
              <div
                key={nodeType.type}
                className="w-full justify-start h-auto py-4 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-green-500"
                onClick={() => handleNodeSelect(nodeType)}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <img src={Icon} alt={nodeType.label} className="size-5 object-contain rounded-sm" />
                  ) : (
                    <Icon className="size-5 text-green-500" />
                  )}
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium text-sm">{nodeType.label}</span>
                    <span className="text-xs text-muted-foreground">{nodeType.description}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Separator />
        <SheetHeader className="px-4 pt-4">
          <SheetTitle className="text-base">iOS Testing - Validation</SheetTitle>
        </SheetHeader>
        <div>
          {iosExpectNodes.map((nodeType) => {
            const Icon = nodeType.icon;
            return (
              <div
                key={nodeType.type}
                className="w-full justify-start h-auto py-4 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-purple-500"
                onClick={() => handleNodeSelect(nodeType)}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <img src={Icon} alt={nodeType.label} className="size-5 object-contain rounded-sm" />
                  ) : (
                    <Icon className="size-5 text-purple-500" />
                  )}
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium text-sm">{nodeType.label}</span>
                    <span className="text-xs text-muted-foreground">{nodeType.description}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <Separator />
        <SheetHeader className="px-4 pt-4">
          <SheetTitle className="text-base">iOS Testing - Analysis</SheetTitle>
        </SheetHeader>
        <div>
          {iosAnalysisNodes.map((nodeType) => {
            const Icon = nodeType.icon;
            return (
              <div
                key={nodeType.type}
                className="w-full justify-start h-auto py-4 px-4 rounded-none cursor-pointer border-l-2 border-transparent hover:border-l-orange-500"
                onClick={() => handleNodeSelect(nodeType)}
              >
                <div className="flex items-center gap-6 w-full overflow-hidden">
                  {typeof Icon === "string" ? (
                    <img src={Icon} alt={nodeType.label} className="size-5 object-contain rounded-sm" />
                  ) : (
                    <Icon className="size-5 text-orange-500" />
                  )}
                  <div className="flex flex-col items-start text-left">
                    <span className="font-medium text-sm">{nodeType.label}</span>
                    <span className="text-xs text-muted-foreground">{nodeType.description}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
