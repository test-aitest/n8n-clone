"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Smartphone } from "lucide-react";
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

interface DeviceSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function DeviceSelector({
  value,
  onChange,
  placeholder = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  className,
}: DeviceSelectorProps) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();

  const {
    data: simulators,
    isLoading,
    refetch,
  } = useQuery({
    ...trpc.iosTesting.listSimulators.queryOptions(),
    enabled: false, // Only fetch when button is clicked
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      refetch();
    }
  };

  const handleSelect = (udid: string) => {
    onChange(udid);
    setOpen(false);
  };

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
          <Button type="button" variant="outline" size="icon">
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
            <p className="text-sm font-medium">Available Simulators</p>
            <p className="text-xs text-muted-foreground">
              Select a simulator to use
            </p>
          </div>
          <div
            className="overflow-y-auto overscroll-contain"
            style={{ maxHeight: "288px" }}
            onWheel={(e) => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading simulators...
              </div>
            ) : simulators && simulators.length > 0 ? (
              <div className="p-1">
                {simulators.map((simulator) => (
                  <button
                    key={simulator.udid}
                    type="button"
                    className={cn(
                      "w-full flex items-start gap-3 p-2 rounded-md text-left hover:bg-accent transition-colors",
                      value === simulator.udid && "bg-accent"
                    )}
                    onClick={() => handleSelect(simulator.udid)}
                  >
                    <Smartphone
                      className={cn(
                        "h-4 w-4 mt-0.5 shrink-0",
                        simulator.state === "Booted"
                          ? "text-green-500"
                          : "text-muted-foreground"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {simulator.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {simulator.runtime}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={cn(
                            "text-xs",
                            simulator.state === "Booted"
                              ? "text-green-600"
                              : "text-muted-foreground"
                          )}
                        >
                          {simulator.state}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                          {simulator.udid}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No simulators found
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
