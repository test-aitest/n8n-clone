"use client";

import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

interface UIComponentSelectorProps {
  value: string;
  onChange: (value: string) => void;
  projectId: string | null;
  componentType?: string; // "Button", "TextField", etc.
  placeholder?: string;
  className?: string;
}

export function UIComponentSelector({
  value,
  onChange,
  projectId,
  componentType,
  placeholder = "Enter accessibility ID",
  className,
}: UIComponentSelectorProps) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();

  const {
    data: components,
    isLoading,
    refetch,
  } = useQuery({
    ...trpc.projects.getUIComponents.queryOptions({
      projectId: projectId || "",
      componentType,
    }),
    enabled: false, // Only fetch when button is clicked
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && projectId) {
      refetch();
    }
  };

  const handleSelect = (accessibilityId: string) => {
    onChange(accessibilityId);
    setOpen(false);
  };

  // Filter out file entries (those that start with "file:")
  const uiComponents = components?.filter(
    (c) => !c.accessibilityId.startsWith("file:")
  );

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!projectId}
            title={projectId ? "Search UI components" : "Select a project first"}
          >
            <Search className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          align="end"
          side="bottom"
          sideOffset={4}
          avoidCollisions={false}
        >
          <div className="p-2 border-b">
            <p className="text-sm font-medium">UI Components</p>
            <p className="text-xs text-muted-foreground">
              Select a component or enter manually
            </p>
          </div>
          <div
            className="overflow-y-auto overscroll-contain"
            style={{ maxHeight: "288px" }}
            onWheel={(e) => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading components...
              </div>
            ) : uiComponents && uiComponents.length > 0 ? (
              <div className="p-1">
                {uiComponents.map((component) => (
                  <button
                    key={component.id}
                    type="button"
                    className={cn(
                      "w-full flex items-start gap-3 p-2 rounded-md text-left hover:bg-accent transition-colors",
                      value === component.accessibilityId && "bg-accent"
                    )}
                    onClick={() => handleSelect(component.accessibilityId)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {component.accessibilityId}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {component.componentType}
                        </span>
                        {component.label && (
                          <span className="text-xs text-muted-foreground truncate">
                            - {component.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <p>No UI components found</p>
                <p className="text-xs mt-1">
                  Enter the accessibility ID manually
                </p>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
