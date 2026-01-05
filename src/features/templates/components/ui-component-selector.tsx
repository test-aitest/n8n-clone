"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Monitor, Search } from "lucide-react";
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
  const [screenOpen, setScreenOpen] = useState(false);
  const [componentOpen, setComponentOpen] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<string | null>(null);
  const [screenSearch, setScreenSearch] = useState("");
  const trpc = useTRPC();

  // Fetch screens for the project
  const {
    data: screens,
    isLoading: screensLoading,
    refetch: refetchScreens,
  } = useQuery({
    ...trpc.projectScreens.getMany.queryOptions({
      projectId: projectId || "",
      search: screenSearch || undefined,
    }),
    enabled: false,
  });

  // Fetch components for the selected screen
  const {
    data: components,
    isLoading: componentsLoading,
    refetch: refetchComponents,
  } = useQuery({
    ...trpc.projects.getUIComponents.queryOptions({
      projectId: projectId || "",
      componentType,
      sourceFilePath: selectedScreen || undefined,
    }),
    enabled: false,
  });

  const handleScreenOpenChange = (isOpen: boolean) => {
    setScreenOpen(isOpen);
    if (isOpen && projectId) {
      refetchScreens();
    }
  };

  const handleComponentOpenChange = (isOpen: boolean) => {
    setComponentOpen(isOpen);
    if (isOpen && projectId && selectedScreen) {
      refetchComponents();
    }
  };

  const handleScreenSelect = (filePath: string, screenName: string) => {
    setSelectedScreen(filePath);
    setScreenOpen(false);
    // Auto-fetch components for the selected screen
    setTimeout(() => refetchComponents(), 100);
  };

  const handleComponentSelect = (accessibilityId: string) => {
    onChange(accessibilityId);
    setComponentOpen(false);
  };

  // Filter out file entries
  const uiComponents = components?.filter(
    (c) => !c.accessibilityId.startsWith("file:")
  );

  // Get selected screen display name
  const selectedScreenName = screens?.find(
    (s) => s.filePath === selectedScreen
  )?.screenName;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Screen Selector */}
      <div className="flex gap-2">
        <Popover open={screenOpen} onOpenChange={handleScreenOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="flex-1 justify-between"
              disabled={!projectId}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Monitor className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {selectedScreenName || selectedScreen || "画面を選択"}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 p-0"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <div className="p-2 border-b">
              <Input
                placeholder="画面名で検索..."
                value={screenSearch}
                onChange={(e) => {
                  setScreenSearch(e.target.value);
                  refetchScreens();
                }}
                className="h-8"
              />
            </div>
            <div
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: "240px" }}
              onWheel={(e) => e.stopPropagation()}
            >
              {screensLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  読み込み中...
                </div>
              ) : screens && screens.length > 0 ? (
                <div className="p-1">
                  {screens.map((screen) => (
                    <button
                      key={screen.filePath}
                      type="button"
                      className={cn(
                        "w-full flex items-center justify-between gap-2 p-2 rounded-md text-left hover:bg-accent transition-colors",
                        selectedScreen === screen.filePath && "bg-accent"
                      )}
                      onClick={() =>
                        handleScreenSelect(screen.filePath, screen.screenName)
                      }
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {screen.screenName}
                        </p>
                        {screen.isCustomName && (
                          <p className="text-xs text-muted-foreground truncate">
                            {screen.filePath}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {screen.elementCount}件
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <p>画面が見つかりません</p>
                  <p className="text-xs mt-1">
                    UI Scanを実行して画面要素を取得してください
                  </p>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Component Selector */}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        <Popover open={componentOpen} onOpenChange={handleComponentOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={!projectId || !selectedScreen}
              title={
                !projectId
                  ? "プロジェクトを選択してください"
                  : !selectedScreen
                    ? "画面を選択してください"
                    : "UI要素を検索"
              }
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
              <p className="text-sm font-medium">UI要素</p>
              <p className="text-xs text-muted-foreground">
                {selectedScreenName || selectedScreen}の要素
              </p>
            </div>
            <div
              className="overflow-y-auto overscroll-contain"
              style={{ maxHeight: "288px" }}
              onWheel={(e) => e.stopPropagation()}
            >
              {componentsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  読み込み中...
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
                      onClick={() =>
                        handleComponentSelect(component.accessibilityId)
                      }
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
                  <p>UI要素が見つかりません</p>
                  <p className="text-xs mt-1">手動で入力してください</p>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
