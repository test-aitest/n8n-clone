"use client";

import { useState, useMemo, Suspense } from "react";
import { useAtomValue } from "jotai";
import { workflowContextAtom } from "@/features/editor/store/atoms";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ComponentIcon, Loader2, CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UIElementBrowserProps {
  onSelect: (accessibilityId: string, label?: string) => void;
  selectedValue?: string;
  trigger?: React.ReactNode;
}

function UIElementList({
  projectId,
  searchQuery,
  onSelect,
  selectedValue,
  onClose,
}: {
  projectId: string;
  searchQuery: string;
  onSelect: (accessibilityId: string, label?: string) => void;
  selectedValue?: string;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const { data: components } = useSuspenseQuery(
    trpc.projects.getUIComponents.queryOptions({ projectId })
  );

  // Filter and group components
  const filteredComponents = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return components
      .filter((comp) => {
        // Skip SwiftUI file entries
        if (comp.componentType === "SwiftUIFile") return false;
        // Filter by search query
        if (!query) return true;
        return (
          comp.accessibilityId.toLowerCase().includes(query) ||
          comp.label?.toLowerCase().includes(query) ||
          comp.componentType.toLowerCase().includes(query)
        );
      })
      .slice(0, 100); // Limit to 100 results
  }, [components, searchQuery]);

  // Group by screen
  const groupedComponents = useMemo(() => {
    const grouped: Record<string, typeof filteredComponents> = {};
    for (const comp of filteredComponents) {
      const screen = comp.sourceFilePath?.split("/").pop() || "Other";
      if (!grouped[screen]) {
        grouped[screen] = [];
      }
      grouped[screen].push(comp);
    }
    return grouped;
  }, [filteredComponents]);

  const handleSelect = (accessibilityId: string, label?: string | null) => {
    onSelect(accessibilityId, label || undefined);
    onClose();
  };

  if (filteredComponents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchQuery
          ? "No elements match your search"
          : "No UI elements found. Run UI Scan to detect elements."}
      </div>
    );
  }

  return (
    <ScrollArea style={{ height: "60vh" }}>
      <div className="space-y-4 pr-4">
        {Object.entries(groupedComponents).map(([screen, comps]) => (
          <div key={screen}>
            <div className="text-xs font-medium text-muted-foreground mb-2 px-1">
              {screen}
            </div>
            <div className="space-y-1">
              {comps.map((comp) => (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() => handleSelect(comp.accessibilityId, comp.label)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
                    "hover:bg-muted/50",
                    selectedValue === comp.accessibilityId && "bg-muted"
                  )}
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
                  <div className="flex-1 min-w-0">
                    <code className="text-xs font-mono truncate block">
                      {comp.accessibilityId}
                    </code>
                    {comp.label && (
                      <span className="text-xs text-muted-foreground truncate block">
                        "{comp.label}"
                      </span>
                    )}
                  </div>
                  {selectedValue === comp.accessibilityId && (
                    <CheckIcon className="size-4 text-primary shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function UIElementBrowser({
  onSelect,
  selectedValue,
  trigger,
}: UIElementBrowserProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const workflowContext = useAtomValue(workflowContextAtom);

  const projectId = workflowContext?.projectId;

  if (!projectId) {
    return (
      <Button variant="outline" size="sm" disabled>
        <ComponentIcon className="size-4 mr-2" />
        Browse
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <ComponentIcon className="size-4 mr-2" />
            Browse
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select UI Element</DialogTitle>
          <DialogDescription>
            Choose a detected UI element to use its accessibility ID.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Input
            placeholder="Search by ID, label, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <UIElementList
            projectId={projectId}
            searchQuery={searchQuery}
            onSelect={onSelect}
            selectedValue={selectedValue}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

// Convenience component for form fields with browse button
export function UIElementInput({
  value,
  onChange,
  placeholder = "accessibilityId",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const handleSelect = (accessibilityId: string) => {
    onChange(accessibilityId);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <UIElementBrowser onSelect={handleSelect} selectedValue={value} />
    </div>
  );
}
