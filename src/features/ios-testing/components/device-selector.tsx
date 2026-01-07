"use client";

import { useQuery } from "@tanstack/react-query";
import { Search, Smartphone, Monitor, Wifi, Cable } from "lucide-react";
import { useState, useMemo } from "react";
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
  /**
   * Filter devices by type.
   * - "physical": Show only physical devices
   * - "simulator": Show only simulators
   */
  deviceFilter: "physical" | "simulator";
}

export function DeviceSelector({
  value,
  onChange,
  placeholder = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
  className,
  deviceFilter,
}: DeviceSelectorProps) {
  const [open, setOpen] = useState(false);
  const trpc = useTRPC();

  const {
    data: devices,
    isLoading,
    refetch,
  } = useQuery({
    ...trpc.iosTesting.listAllDevices.queryOptions(),
    enabled: false, // Only fetch when button is clicked
  });

  // Group devices by type, respecting the filter
  const groupedDevices = useMemo(() => {
    if (!devices) return { physical: [], simulators: [] };

    const physical = deviceFilter === "simulator"
      ? []
      : devices.filter((d) => d.deviceType === "physical");
    const simulators = deviceFilter === "physical"
      ? []
      : devices.filter((d) => d.deviceType === "simulator");

    return { physical, simulators };
  }, [devices, deviceFilter]);

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

  // Device type from the API
  type DeviceInfo = NonNullable<typeof devices>[number];

  const getConnectionIcon = (connectionType?: "usb" | "wifi" | "unknown") => {
    if (connectionType === "usb") {
      return <Cable className="h-3 w-3 text-muted-foreground" />;
    }
    if (connectionType === "wifi") {
      return <Wifi className="h-3 w-3 text-muted-foreground" />;
    }
    return null;
  };

  const renderDevice = (device: DeviceInfo) => {
    const isPhysical = device.deviceType === "physical";
    const isReady = isPhysical
      ? device.state === "connected"
      : device.state === "Booted";

    return (
      <button
        key={device.udid}
        type="button"
        className={cn(
          "w-full flex items-start gap-3 p-2 rounded-md text-left hover:bg-accent transition-colors",
          value === device.udid && "bg-accent"
        )}
        onClick={() => handleSelect(device.udid)}
      >
        {isPhysical ? (
          <Smartphone
            className={cn(
              "h-4 w-4 mt-0.5 shrink-0",
              isReady ? "text-blue-500" : "text-muted-foreground"
            )}
          />
        ) : (
          <Monitor
            className={cn(
              "h-4 w-4 mt-0.5 shrink-0",
              isReady ? "text-green-500" : "text-muted-foreground"
            )}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{device.name}</p>
            {isPhysical && getConnectionIcon(device.connectionType)}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {device.osVersion}
            {device.modelName && ` - ${device.modelName}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={cn(
                "text-xs",
                isReady ? "text-green-600" : "text-muted-foreground"
              )}
            >
              {device.state}
            </span>
            <span className="text-xs text-muted-foreground truncate font-mono">
              {device.udid.substring(0, 8)}...
            </span>
          </div>
        </div>
      </button>
    );
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
            <p className="text-sm font-medium">Available Devices</p>
            <p className="text-xs text-muted-foreground">
              {deviceFilter === "physical"
                ? "Select a physical device"
                : "Select a simulator"}
            </p>
          </div>
          <div
            className="overflow-y-auto overscroll-contain"
            style={{ maxHeight: "360px" }}
            onWheel={(e) => e.stopPropagation()}
          >
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Loading devices...
              </div>
            ) : devices && devices.length > 0 ? (
              <div className="p-1">
                {/* Physical Devices Section */}
                {groupedDevices.physical.length > 0 && (
                  <div className="mb-2">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <Smartphone className="h-3 w-3" />
                      Physical Devices ({groupedDevices.physical.length})
                    </div>
                    {groupedDevices.physical.map(renderDevice)}
                  </div>
                )}

                {/* Simulators Section */}
                {groupedDevices.simulators.length > 0 && (
                  <div>
                    {groupedDevices.physical.length > 0 && (
                      <div className="border-t my-1" />
                    )}
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                      <Monitor className="h-3 w-3" />
                      Simulators ({groupedDevices.simulators.length})
                    </div>
                    {groupedDevices.simulators.map(renderDevice)}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No devices found
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
