"use client";

import { useSuspensePackage } from "../hooks/use-packages";
import {
  useUpdatePackage,
  useExecutePackage,
  useRemoveWorkflowFromPackage,
  useValidateParallel,
} from "../hooks/use-packages";
import { usePackageExecutionStatus } from "../hooks/use-package-execution-status";
import { fetchPackageExecutionRealtimeToken } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeftIcon,
  PlayIcon,
  Trash2Icon,
  AlertTriangleIcon,
  CheckIcon,
  Loader2,
  XCircleIcon,
  CheckCircle2Icon,
  ClockIcon,
  PackageIcon,
  FolderIcon,
  SettingsIcon,
  ListIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { WorkflowStatus } from "@/inngest/channels/package-execution";
import { formatDistanceToNow } from "date-fns";

interface PackageDetailProps {
  packageId: string;
}

interface WorkflowItemProps {
  name: string;
  targetDeviceId: string | null;
  onRemove: () => void;
  isRemoving: boolean;
  status?: WorkflowStatus;
}

const WorkflowItem = ({
  name,
  targetDeviceId,
  onRemove,
  isRemoving,
  status,
}: WorkflowItemProps) => {
  const getStatusIcon = () => {
    switch (status) {
      case "pending":
        return <ClockIcon className="size-4 text-muted-foreground" />;
      case "running":
        return <Loader2 className="size-4 animate-spin" />;
      case "success":
        return <CheckCircle2Icon className="size-4 text-green-600" />;
      case "failed":
        return <XCircleIcon className="size-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg border bg-card",
        status === "running" && "border-blue-500",
        status === "success" && "border-green-500",
        status === "failed" && "border-red-500"
      )}
    >
      {status && <div className="shrink-0">{getStatusIcon()}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{name}</div>
        {targetDeviceId && (
          <div className="text-xs text-muted-foreground truncate">
            Simulator: {targetDeviceId}
          </div>
        )}
      </div>
      <Button
        size="icon"
        variant="ghost"
        onClick={onRemove}
        disabled={isRemoving}
        className="shrink-0 size-8"
      >
        <Trash2Icon className="size-4 text-muted-foreground hover:text-red-600" />
      </Button>
    </div>
  );
};

export const PackageDetail = ({ packageId }: PackageDetailProps) => {
  const router = useRouter();
  const packageQuery = useSuspensePackage(packageId);
  const pkg = packageQuery.data;

  const [name, setName] = useState(pkg.name);
  const [executionMode, setExecutionMode] = useState(pkg.executionMode);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const updatePackage = useUpdatePackage();
  const executePackage = useExecutePackage();
  const removeWorkflow = useRemoveWorkflowFromPackage();

  // Real-time execution status
  const executionStatus = usePackageExecutionStatus({
    packageId,
    refreshToken: fetchPackageExecutionRealtimeToken,
  });

  const validationQuery = useValidateParallel(
    packageId,
    executionMode === "PARALLEL"
  );

  const handleSave = () => {
    updatePackage.mutate(
      {
        id: packageId,
        name,
        executionMode,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
  };

  const handleExecute = () => {
    // Reset the status to prepare for new execution
    executionStatus.reset?.();
    setIsExecuting(true);
    executePackage.mutate({ id: packageId });
  };

  // Note: We no longer auto-hide the status after completion
  // The status will remain visible until the user starts a new execution

  const handleRemoveWorkflow = (workflowId: string) => {
    removeWorkflow.mutate({
      packageId,
      workflowId,
    });
  };

  const hasValidationErrors =
    executionMode === "PARALLEL" &&
    validationQuery.data &&
    !validationQuery.data.isValid;

  const canExecute =
    pkg.workflows.length > 0 &&
    !hasValidationErrors &&
    !executePackage.isPending;

  return (
    <div className="p-4 md:px-10 md:py-6 h-full">
      <div className="mx-auto max-w-7xl w-full flex flex-col gap-y-8">
        {/* Header */}
        <div className="flex flex-row items-center justify-between gap-x-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/workflows")}
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div className="flex flex-col gap-0.5">
              {isEditing ? (
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="text-xl font-semibold tracking-tight border-none shadow-none px-0 h-auto focus-visible:ring-0"
                  placeholder="Package name"
                  autoFocus
                  onBlur={() => {
                    if (name !== pkg.name) {
                      handleSave();
                    } else {
                      setIsEditing(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSave();
                    } else if (e.key === "Escape") {
                      setName(pkg.name);
                      setIsEditing(false);
                    }
                  }}
                />
              ) : (
                <h1
                  className="text-xl font-semibold tracking-tight cursor-pointer hover:text-muted-foreground"
                  onClick={() => setIsEditing(true)}
                >
                  {pkg.name}
                </h1>
              )}
              <p className="text-sm text-muted-foreground">
                Updated{" "}
                {formatDistanceToNow(pkg.updatedAt, { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={
                updatePackage.isPending ||
                (name === pkg.name && executionMode === pkg.executionMode)
              }
            >
              {updatePackage.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              Save
            </Button>
            <Button size="sm" onClick={handleExecute} disabled={!canExecute}>
              {executePackage.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PlayIcon className="size-4" />
              )}
              Execute
            </Button>
          </div>
        </div>

        {/* Execution Status */}
        {isExecuting && (
          <div
            className={cn(
              "flex flex-col gap-y-4 p-4 rounded-lg border bg-card",
              executionStatus.overallStatus === "running" && "border-blue-500",
              executionStatus.overallStatus === "success" && "border-green-500",
              executionStatus.overallStatus === "failed" && "border-red-500"
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "shrink-0 size-9 flex items-center justify-center rounded-md",
                  executionStatus.overallStatus === "idle" && "bg-muted",
                  executionStatus.overallStatus === "running" && "bg-blue-100",
                  executionStatus.overallStatus === "success" && "bg-green-100",
                  executionStatus.overallStatus === "failed" && "bg-red-100"
                )}
              >
                {executionStatus.overallStatus === "running" && (
                  <Loader2 className="size-5 animate-spin" />
                )}
                {executionStatus.overallStatus === "success" && (
                  <CheckCircle2Icon className="size-5 text-green-600" />
                )}
                {executionStatus.overallStatus === "failed" && (
                  <XCircleIcon className="size-5 text-red-600" />
                )}
                {executionStatus.overallStatus === "idle" && (
                  <ClockIcon className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {executionStatus.overallStatus === "running" && (
                    <>
                      Executing: {executionStatus.currentWorkflowName || "..."}
                    </>
                  )}
                  {executionStatus.overallStatus === "success" &&
                    "Execution Completed"}
                  {executionStatus.overallStatus === "failed" &&
                    "Execution Failed"}
                  {executionStatus.overallStatus === "idle" && "Starting..."}
                </div>
                <div className="text-xs text-muted-foreground">
                  {executionStatus.counts.success +
                    executionStatus.counts.failed}{" "}
                  / {executionStatus.counts.total} workflows completed
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {executionStatus.counts.total > 0 && (
              <Progress
                value={
                  ((executionStatus.counts.success +
                    executionStatus.counts.failed) /
                    executionStatus.counts.total) *
                  100
                }
                className={cn(
                  "h-2",
                  executionStatus.overallStatus === "failed" &&
                    "[&>div]:bg-red-500",
                  executionStatus.overallStatus === "success" &&
                    "[&>div]:bg-green-500"
                )}
              />
            )}

            {/* Current node info during execution */}
            {executionStatus.overallStatus === "running" &&
              executionStatus.currentNode && (
                <div className="flex flex-col gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Loader2 className="size-4 animate-spin" />
                      <span className="text-sm font-medium">
                        Executing Node: {executionStatus.currentNode.nodeName}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-xs border-blue-300"
                      >
                        {executionStatus.currentNode.nodeType}
                      </Badge>
                    </div>
                    {executionStatus.nodeProgress && (
                      <span className="text-xs">
                        {executionStatus.nodeProgress.completed}/
                        {executionStatus.nodeProgress.total} nodes
                      </span>
                    )}
                  </div>
                </div>
              )}

            {/* Error details */}
            {executionStatus.overallStatus === "failed" && (
              <div className="flex flex-col gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-2 text-red-800">
                  <XCircleIcon className="size-4" />
                  <span className="text-sm font-medium">
                    Failed:{" "}
                    {executionStatus.failedWorkflowName || "Unknown workflow"}
                  </span>
                </div>
                {executionStatus.failedNodeName && (
                  <div className="text-sm text-red-700 pl-6">
                    Failed at node:{" "}
                    <span className="font-medium">
                      {executionStatus.failedNodeName}
                    </span>
                  </div>
                )}
                {executionStatus.errorMessage && (
                  <div className="text-sm text-red-700 pl-6">
                    Error: {executionStatus.errorMessage}
                  </div>
                )}
              </div>
            )}

            {/* Workflow execution results */}
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-muted-foreground">
                Workflow Results
              </div>
              <div className="space-y-1">
                {Object.entries(executionStatus.workflowStatuses).map(
                  ([wfId, wfStatus]) => {
                    const wfName = executionStatus.workflowNames[wfId] || wfId;
                    return (
                      <div
                        key={wfId}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded text-sm",
                          wfStatus === "pending" &&
                            "bg-muted/50 text-muted-foreground",
                          wfStatus === "running" && "bg-blue-50 text-blue-700",
                          wfStatus === "success" &&
                            "bg-green-50 text-green-700",
                          wfStatus === "failed" && "bg-red-50 text-red-700"
                        )}
                      >
                        {wfStatus === "pending" && (
                          <ClockIcon className="size-4" />
                        )}
                        {wfStatus === "running" && (
                          <Loader2 className="size-4 animate-spin" />
                        )}
                        {wfStatus === "success" && (
                          <CheckCircle2Icon className="size-4" />
                        )}
                        {wfStatus === "failed" && (
                          <XCircleIcon className="size-4" />
                        )}
                        <span className="flex-1 truncate">{wfName}</span>
                        <span className="text-xs capitalize">{wfStatus}</span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          </div>
        )}

        {/* Validation Warning */}
        {hasValidationErrors && validationQuery.data && (
          <div className="flex flex-col gap-y-3 p-4 rounded-lg border border-red-500 bg-red-50">
            <div className="flex items-center gap-3">
              <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-red-100">
                <AlertTriangleIcon className="size-5 text-red-600" />
              </div>
              <div>
                <div className="text-sm font-medium text-red-900">
                  Parallel Execution Error
                </div>
                <div className="text-xs text-red-700">
                  The following workflows use the same simulator and cannot run
                  in parallel
                </div>
              </div>
            </div>
            <ul className="text-sm space-y-1 pl-12">
              {validationQuery.data.duplicates.map((dup) => (
                <li key={dup.deviceId} className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-xs">
                    {dup.deviceId}
                  </Badge>
                  <span className="text-red-800">
                    {dup.workflowNames.join(", ")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Package Info */}
        <div className="flex flex-col gap-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            {/* Package Name */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
              <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
                <PackageIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Package</div>
                <div className="text-xs text-muted-foreground truncate">
                  {pkg.name}
                </div>
              </div>
            </div>

            {/* Project */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
              <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
                <FolderIcon className="size-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium">Project</div>
                <div className="text-xs text-muted-foreground truncate">
                  {pkg.project.name}
                </div>
              </div>
            </div>

            {/* Workflow Count */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
              <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
                <ListIcon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-semibold">
                  {pkg.workflows.length}
                </div>
                <div className="text-xs text-muted-foreground">Workflows</div>
              </div>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-y-4">
          <div className="flex items-center gap-2">
            <SettingsIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Settings</h2>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg border bg-card">
            <span className="text-sm text-muted-foreground">
              Execution Mode:
            </span>
            <Select
              value={executionMode}
              onValueChange={(v) =>
                setExecutionMode(v as "PARALLEL" | "SEQUENTIAL")
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEQUENTIAL">
                  Sequential (one at a time)
                </SelectItem>
                <SelectItem value="PARALLEL">Parallel (all at once)</SelectItem>
              </SelectContent>
            </Select>
            {executionMode === "PARALLEL" && validationQuery.data?.isValid && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-600"
              >
                <CheckIcon className="size-3 mr-1" />
                Valid
              </Badge>
            )}
          </div>
        </div>

        {/* Workflows List */}
        <div className="flex flex-col gap-y-4">
          <div className="flex items-center gap-2">
            <ListIcon className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">
              Workflows ({pkg.workflows.length})
            </h2>
          </div>

          {pkg.workflows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-lg border bg-card text-center">
              <PackageIcon className="size-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">
                No workflows added yet.
              </p>
              <p className="text-xs text-muted-foreground">
                Use &quot;Add to Package&quot; from the Workflows page.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pkg.workflows.map((pw) => (
                <WorkflowItem
                  key={pw.workflow.id}
                  name={pw.workflow.name}
                  targetDeviceId={pw.workflow.targetDeviceId}
                  onRemove={() => handleRemoveWorkflow(pw.workflow.id)}
                  isRemoving={removeWorkflow.isPending}
                  status={
                    isExecuting
                      ? executionStatus.workflowStatuses[pw.workflow.id]
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
