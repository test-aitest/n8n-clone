"use client";

import { useSuspenseProject, useRemoveProject, useRescanProject, useUpdateProject } from "../hooks/use-projects";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeftIcon,
  FolderIcon,
  SmartphoneIcon,
  FileCodeIcon,
  TrashIcon,
  Loader2,
  WorkflowIcon,
  LayoutTemplateIcon,
  RefreshCwIcon,
  KeyIcon,
  SaveIcon,
} from "lucide-react";
import { UIComponentsSection } from "./ui-components-section";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface ProjectDetailProps {
  projectId: string;
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const router = useRouter();
  const { data: project } = useSuspenseProject(projectId);
  const removeProject = useRemoveProject();
  const rescanProject = useRescanProject();
  const updateProject = useUpdateProject();

  // State for Apple Developer settings
  const [xcodeOrgId, setXcodeOrgId] = useState(project.xcodeOrgId || "");
  const [xcodeSigningId, setXcodeSigningId] = useState(project.xcodeSigningId || "");
  const [hasSigningChanges, setHasSigningChanges] = useState(false);

  const handleSaveSigningSettings = () => {
    updateProject.mutate(
      {
        id: projectId,
        xcodeOrgId: xcodeOrgId || undefined,
        xcodeSigningId: xcodeSigningId || undefined,
      },
      {
        onSuccess: () => {
          setHasSigningChanges(false);
          toast.success("Signing settings saved");
        },
      }
    );
  };

  const handleRescan = () => {
    rescanProject.mutate(
      { id: projectId },
      {
        onSuccess: (data) => {
          toast.success(
            `Rescan complete: ${data.uiComponentCount} UI components found, ${data.swiftUIFileCount} SwiftUI files`
          );
        },
        onError: (error) => {
          toast.error(`Rescan failed: ${error.message}`);
        },
      }
    );
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this project?")) {
      removeProject.mutate(
        { id: projectId },
        {
          onSuccess: () => {
            router.push("/projects");
          },
        }
      );
    }
  };

  return (
    <div className="p-4 md:px-10 md:py-6 h-full">
      <div className="mx-auto max-w-7xl w-full flex flex-col gap-y-8">
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-x-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/projects")}>
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
              <p className="text-sm text-muted-foreground">
                Updated {formatDistanceToNow(project.updatedAt, { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRescan}
              disabled={rescanProject.isPending}
            >
              {rescanProject.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCwIcon className="size-4" />
              )}
              Rescan
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={removeProject.isPending}
            >
              {removeProject.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <TrashIcon className="size-4" />
              )}
              Delete
            </Button>
          </div>
        </div>

        {/* Project Info */}
        <div className="flex flex-col gap-y-4">
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {/* Project Path */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
              <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
                <FolderIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Project Path</div>
                <div className="text-xs text-muted-foreground truncate">
                  {project.projectPath}
                </div>
              </div>
            </div>

            {/* Bundle ID */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
              <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
                <FileCodeIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Bundle ID</div>
                <div className="text-xs text-muted-foreground">
                  {project.bundleId || "Not detected"}
                </div>
              </div>
            </div>

            {/* Target Device */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
              <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
                <SmartphoneIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Target Device</div>
                <div className="text-xs text-muted-foreground">
                  {project.targetDeviceId || "Not set"}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
              <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
                <WorkflowIcon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{project._count.workflows}</div>
                <div className="text-xs text-muted-foreground">Workflows</div>
              </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
              <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
                <LayoutTemplateIcon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-semibold">{project._count.templates}</div>
                <div className="text-xs text-muted-foreground">Templates</div>
              </div>
            </div>
          </div>

          {/* Apple Developer Settings (for physical device testing) */}
          <div className="flex flex-col gap-y-4 p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyIcon className="size-4 text-muted-foreground" />
                <h3 className="font-medium">Apple Developer Settings</h3>
              </div>
              {hasSigningChanges && (
                <Button
                  size="sm"
                  onClick={handleSaveSigningSettings}
                  disabled={updateProject.isPending}
                >
                  {updateProject.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <SaveIcon className="size-4" />
                  )}
                  Save
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Required for testing on physical iOS devices. Get your Team ID from{" "}
              <a
                href="https://developer.apple.com/account"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Apple Developer Portal
              </a>
              .
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="xcodeOrgId">Team ID (xcodeOrgId)</Label>
                <Input
                  id="xcodeOrgId"
                  placeholder="e.g., ABC123XYZ"
                  value={xcodeOrgId}
                  onChange={(e) => {
                    setXcodeOrgId(e.target.value);
                    setHasSigningChanges(true);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="xcodeSigningId">Signing Identity</Label>
                <Input
                  id="xcodeSigningId"
                  placeholder="iPhone Developer (default)"
                  value={xcodeSigningId}
                  onChange={(e) => {
                    setXcodeSigningId(e.target.value);
                    setHasSigningChanges(true);
                  }}
                />
              </div>
            </div>
          </div>

          {/* UI Components Section */}
          <UIComponentsSection
            projectId={projectId}
            totalCount={project._count.uiComponents}
          />

          {/* App Path */}
          {project.appPath && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
              <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
                <FolderIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Built App Path</div>
                <div className="text-xs text-muted-foreground break-all">
                  {project.appPath}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
