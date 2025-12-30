"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProject } from "../hooks/use-projects";
import { useTRPC } from "@/trpc/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, FolderSearch, CheckCircle, XCircle } from "lucide-react";

interface ProjectCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectCreateDialog({
  open,
  onOpenChange,
}: ProjectCreateDialogProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const createProject = useCreateProject();

  const [name, setName] = useState("");
  const [projectPath, setProjectPath] = useState("");
  const [targetDeviceId, setTargetDeviceId] = useState<string>("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<{
    found: boolean;
    type: string | null;
    name: string | null;
    info: {
      bundleId: string | null;
      schemes: string[];
      targets: string[];
      swiftFileCount: number;
      hasSwiftUI: boolean;
    } | null;
  } | null>(null);

  const queryClient = useQueryClient();

  // Fetch available simulators
  const simulatorsQuery = useQuery(trpc.projects.listSimulators.queryOptions());

  const handleDetectProject = async () => {
    if (!projectPath.trim()) return;

    setIsDetecting(true);
    setDetectionResult(null);

    try {
      // Use fetchQuery to get fresh data with current projectPath
      const result = await queryClient.fetchQuery(
        trpc.projects.detectProject.queryOptions({ directoryPath: projectPath })
      );
      if (result) {
        setDetectionResult(result);
        // Auto-fill name if detected
        if (result.name && !name) {
          setName(result.name);
        }
      }
    } catch (error) {
      console.error("Detection failed:", error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleCreate = () => {
    createProject.mutate(
      {
        name: name.trim(),
        projectPath: projectPath.trim(),
        targetDeviceId: targetDeviceId || undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          router.push("/projects");
          router.refresh();
        },
      }
    );
  };

  const isValid =
    name.trim().length > 0 &&
    projectPath.trim().length > 0 &&
    detectionResult?.found;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
          <DialogDescription>
            Connect an Xcode project to automatically detect simulators and UI
            components.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Project Path */}
          <div className="grid gap-2">
            <Label htmlFor="projectPath">Xcode Project Path</Label>
            <div className="flex gap-2">
              <Input
                id="projectPath"
                placeholder="/Users/you/MyApp/MyApp.xcodeproj"
                value={projectPath}
                onChange={(e) => {
                  setProjectPath(e.target.value);
                  setDetectionResult(null);
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleDetectProject}
                disabled={isDetecting || !projectPath.trim()}
              >
                {isDetecting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <FolderSearch className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Path to .xcodeproj, .xcworkspace, or Package.swift
            </p>
          </div>

          {/* Detection Result */}
          {detectionResult && (
            <div
              className={`rounded-lg p-3 ${
                detectionResult.found
                  ? "bg-green-500/10 border border-green-500/20"
                  : "bg-red-500/10 border border-red-500/20"
              }`}
            >
              <div className="flex items-center gap-2">
                {detectionResult.found ? (
                  <>
                    <CheckCircle className="size-4 text-green-500" />
                    <span className="font-medium text-green-500">
                      Project detected
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="size-4 text-red-500" />
                    <span className="font-medium text-red-500">
                      No project found
                    </span>
                  </>
                )}
              </div>
              {detectionResult.found && detectionResult.info && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  <p>Type: {detectionResult.type}</p>
                  {detectionResult.info.bundleId && (
                    <p>Bundle ID: {detectionResult.info.bundleId}</p>
                  )}
                  <p>Swift files: {detectionResult.info.swiftFileCount}</p>
                  <p>
                    SwiftUI: {detectionResult.info.hasSwiftUI ? "Yes" : "No"}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Project Name */}
          <div className="grid gap-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              placeholder="My iOS App"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Simulator Selection */}
          <div className="grid gap-2">
            <Label htmlFor="simulator">Default Simulator (Optional)</Label>
            <Select value={targetDeviceId} onValueChange={setTargetDeviceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a simulator" />
              </SelectTrigger>
              <SelectContent>
                {simulatorsQuery.data?.map((sim) => (
                  <SelectItem key={sim.udid} value={sim.udid}>
                    {sim.name} ({sim.runtime})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isValid || createProject.isPending}
          >
            {createProject.isPending && (
              <Loader2 className="size-4 mr-2 animate-spin" />
            )}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
