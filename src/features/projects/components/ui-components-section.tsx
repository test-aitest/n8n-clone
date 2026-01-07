"use client";

import { useState, Suspense } from "react";
import {
  useUIComponents,
  useProjectScreens,
  useUpdateScreenName,
} from "../hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ComponentIcon,
  CopyIcon,
  CheckIcon,
  Loader2,
  MoreVerticalIcon,
  PencilIcon,
  XIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface UIComponentsSectionProps {
  projectId: string;
  totalCount: number;
}

// Group UI components by screen (sourceFilePath)
function groupByScreen(
  components: Array<{
    id: string;
    accessibilityId: string;
    componentType: string;
    label: string | null;
    sourceFilePath: string | null;
  }>
) {
  const grouped: Record<
    string,
    Array<{
      id: string;
      accessibilityId: string;
      componentType: string;
      label: string | null;
    }>
  > = {};

  for (const comp of components) {
    // Skip SwiftUI file entries
    if (comp.componentType === "SwiftUIFile") continue;

    const screen = comp.sourceFilePath || "Unknown Screen";
    if (!grouped[screen]) {
      grouped[screen] = [];
    }
    grouped[screen].push({
      id: comp.id,
      accessibilityId: comp.accessibilityId,
      componentType: comp.componentType,
      label: comp.label,
    });
  }

  return grouped;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-6 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={handleCopy}
    >
      {copied ? (
        <CheckIcon className="size-3 text-green-600" />
      ) : (
        <CopyIcon className="size-3" />
      )}
    </Button>
  );
}

function ScreenGroup({
  projectId,
  filePath,
  screenName,
  components,
  defaultOpen = false,
}: {
  projectId: string;
  filePath: string;
  screenName: string;
  components: Array<{
    id: string;
    accessibilityId: string;
    componentType: string;
    label: string | null;
  }>;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(screenName);
  const updateScreenName = useUpdateScreenName();

  const handleSave = () => {
    if (editValue.trim() && editValue !== screenName) {
      updateScreenName.mutate({
        projectId,
        filePath,
        screenName: editValue.trim(),
      });
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(screenName);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex items-center gap-1">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1 px-3 py-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-7 text-sm"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0"
              onClick={handleSave}
              disabled={updateScreenName.isPending}
            >
              <CheckIcon className="size-4 text-green-600" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 shrink-0"
              onClick={handleCancel}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        ) : (
          <>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 flex-1 px-3 py-2 hover:bg-muted/50 rounded-md transition-colors text-left"
              >
                {isOpen ? (
                  <ChevronDownIcon className="size-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRightIcon className="size-4 text-muted-foreground shrink-0" />
                )}
                <span className="font-medium text-sm truncate">
                  {screenName}
                </span>
                <Badge variant="secondary" className="ml-auto shrink-0">
                  {components.length}
                </Badge>
              </button>
            </CollapsibleTrigger>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="size-7 shrink-0">
                  <MoreVerticalIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                  <PencilIcon className="size-4 mr-2" />
                  Rename
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}
      </div>
      <CollapsibleContent>
        <div className="ml-6 border-l pl-3 space-y-0.5">
          {components.map((comp) => (
            <div
              key={comp.id}
              className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors"
            >
              <Badge
                variant="outline"
                className={cn(
                  "text-xs shrink-0",
                  comp.componentType === "Button" &&
                    "border-blue-300 text-blue-700",
                  comp.componentType === "TextField" &&
                    "border-green-300 text-green-700",
                  comp.componentType === "Text" &&
                    "border-gray-300 text-gray-700",
                  comp.componentType === "Image" &&
                    "border-purple-300 text-purple-700"
                )}
              >
                {comp.componentType}
              </Badge>
              <code className="text-xs font-mono text-muted-foreground truncate flex-1">
                {comp.accessibilityId}
              </code>
              {comp.label && (
                <span className="text-xs text-muted-foreground truncate max-w-30">
                  "{comp.label}"
                </span>
              )}
              <CopyButton text={comp.accessibilityId} />
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function UIComponentsContent({ projectId }: { projectId: string }) {
  const { data: components } = useUIComponents(projectId);
  const { data: screens } = useProjectScreens(projectId);
  const grouped = groupByScreen(components);

  // Create a map of filePath -> screenName from projectScreens
  const screenNameMap = new Map(screens.map((s) => [s.filePath, s.screenName]));

  // Get unique file paths from grouped components
  const filePaths = Object.keys(grouped).sort();

  if (filePaths.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No UI components detected. Run UI Scan in a workflow to detect elements.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filePaths.map((filePath, index) => {
        // Use custom screen name if available, otherwise use filename
        const screenName =
          screenNameMap.get(filePath) || filePath.split("/").pop() || filePath;
        return (
          <ScreenGroup
            key={filePath}
            projectId={projectId}
            filePath={filePath}
            screenName={screenName}
            components={grouped[filePath]}
            defaultOpen={index === 0}
          />
        );
      })}
    </div>
  );
}

export function UIComponentsSection({
  projectId,
  totalCount,
}: UIComponentsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border bg-card">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-3 w-full px-4 py-3 hover:bg-muted/30 transition-colors text-left"
          >
            <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
              <ComponentIcon className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">UI Components</div>
              <div className="text-xs text-muted-foreground">
                {totalCount} elements detected
              </div>
            </div>
            {isOpen ? (
              <ChevronDownIcon className="size-5 text-muted-foreground shrink-0" />
            ) : (
              <ChevronRightIcon className="size-5 text-muted-foreground shrink-0" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t">
            <Suspense
              fallback={
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              }
            >
              <UIComponentsContent projectId={projectId} />
            </Suspense>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
