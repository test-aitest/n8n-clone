"use client";

import { formatDistanceToNow } from "date-fns";
import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntityPagination,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import {
  useCreatePackage,
  useDeletePackage,
  useSuspensePackages,
  useExecutePackage,
} from "../hooks/use-packages";
import { usePackagesParams } from "../hooks/use-packages-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import { usePackageExecutionStatus } from "../hooks/use-package-execution-status";
import { fetchPackageExecutionRealtimeToken } from "../actions";
import {
  PackageIcon,
  Play,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import type { ExecutionMode } from "@/generated/prisma/browser";
import { useState } from "react";
import { cn } from "@/lib/utils";

type PackageWithWorkflows = {
  id: string;
  name: string;
  description: string | null;
  projectId: string;
  executionMode: ExecutionMode;
  createdAt: Date;
  updatedAt: Date;
  workflows: Array<{
    workflow: {
      id: string;
      name: string;
      targetDeviceId: string | null;
    };
  }>;
  _count: {
    workflows: number;
  };
};

export const PackagesSearch = () => {
  const [params, setParams] = usePackagesParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search packages"
    />
  );
};

export const PackagesList = ({ projectId }: { projectId: string }) => {
  const packages = useSuspensePackages(projectId);

  return (
    <EntityList
      items={packages.data.items}
      getKey={(pkg) => pkg.id}
      renderItem={(pkg) => <PackageItem data={pkg as PackageWithWorkflows} />}
      emptyView={<PackagesEmpty projectId={projectId} />}
    />
  );
};

export const PackagesHeader = ({
  projectId,
  disabled,
}: {
  projectId: string;
  disabled?: boolean;
}) => {
  const createPackage = useCreatePackage();

  const handleCreate = () => {
    createPackage.mutate({
      name: `Package ${Date.now()}`,
      projectId,
    });
  };

  return (
    <EntityHeader
      title="Packages"
      description="Group and execute multiple workflows together"
      onNew={handleCreate}
      newButtonLabel="New package"
      disabled={disabled}
      isCreating={createPackage.isPending}
    />
  );
};

export const PackagesPagination = ({ projectId }: { projectId: string }) => {
  const packages = useSuspensePackages(projectId);
  const [params, setParams] = usePackagesParams();

  return (
    <EntityPagination
      disabled={packages.isFetching}
      totalPages={packages.data.totalPages}
      page={packages.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const PackagesContainer = ({
  children,
  projectId,
}: {
  children: React.ReactNode;
  projectId: string;
}) => {
  return (
    <EntityContainer
      header={<PackagesHeader projectId={projectId} />}
      search={<PackagesSearch />}
      pagination={<PackagesPagination projectId={projectId} />}
    >
      {children}
    </EntityContainer>
  );
};

export const PackagesLoading = () => {
  return <LoadingView message="Loading packages..." />;
};

export const PackagesError = () => {
  return <ErrorView message="Error loading packages" />;
};

export const PackagesEmpty = ({ projectId }: { projectId: string }) => {
  const createPackage = useCreatePackage();

  const handleCreate = () => {
    createPackage.mutate({
      name: `Package ${Date.now()}`,
      projectId,
    });
  };

  return (
    <EmptyView
      onNew={handleCreate}
      message="You haven't created any packages yet. Create a package to group and execute multiple workflows together."
    />
  );
};

export const PackageItem = ({ data }: { data: PackageWithWorkflows }) => {
  const deletePackage = useDeletePackage();
  const executePackage = useExecutePackage();
  const [isExecuting, setIsExecuting] = useState(false);

  // Real-time execution status
  const executionStatus = usePackageExecutionStatus({
    packageId: data.id,
    refreshToken: fetchPackageExecutionRealtimeToken,
  });

  const handleRemove = () => {
    deletePackage.mutate({ id: data.id });
  };

  const handleExecute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Reset the status to prepare for new execution
    executionStatus.reset?.();
    setIsExecuting(true);
    executePackage.mutate({ id: data.id });
  };

  // Note: We no longer auto-hide the status after completion
  // The status will remain visible until the user starts a new execution

  // Check for duplicate simulator IDs
  const deviceIds = data.workflows
    .map((pw) => pw.workflow.targetDeviceId)
    .filter(Boolean);
  const hasDuplicateDevices =
    data.executionMode === "PARALLEL" &&
    deviceIds.length !== new Set(deviceIds).size;

  const progressValue =
    executionStatus.counts.total > 0
      ? ((executionStatus.counts.success + executionStatus.counts.failed) /
          executionStatus.counts.total) *
        100
      : 0;

  return (
    <EntityItem
      href={`/packages/${data.id}`}
      title={data.name}
      subtitle={
        <div className="flex items-center gap-2">
          <span>
            {data._count.workflows} workflow
            {data._count.workflows !== 1 ? "s" : ""}
          </span>
          <span>&bull;</span>
          <Badge
            variant={
              data.executionMode === "PARALLEL" ? "default" : "secondary"
            }
            className="text-xs"
          >
            {data.executionMode === "PARALLEL" ? "Parallel" : "Sequential"}
          </Badge>
          <span>&bull;</span>
          <span>
            Updated {formatDistanceToNow(data.updatedAt, { addSuffix: true })}
          </span>
          {hasDuplicateDevices && (
            <>
              <span>&bull;</span>
              <span className="text-destructive flex items-center gap-1">
                <AlertTriangle className="size-3" />
                Duplicate simulators
              </span>
            </>
          )}
        </div>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <PackageIcon className="size-5 text-muted-foreground" />
        </div>
      }
      actions={
        <Button
          size="sm"
          variant="outline"
          onClick={handleExecute}
          disabled={
            executePackage.isPending ||
            isExecuting ||
            data._count.workflows === 0 ||
            hasDuplicateDevices
          }
        >
          {isExecuting && executionStatus.overallStatus === "running" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          {isExecuting && executionStatus.overallStatus === "running"
            ? "Running..."
            : "Execute"}
        </Button>
      }
      onRemove={handleRemove}
      isRemoving={deletePackage.isPending}
    >
      {/* Execution Progress */}
      {isExecuting && (
        <div className="px-4 pb-3">
          <div
            className={cn(
              "flex flex-col gap-2 p-3 rounded-lg border",
              executionStatus.overallStatus === "running" &&
                "bg-lime-50 border-lime-300",
              executionStatus.overallStatus === "success" &&
                "bg-blue-50 border-blue-300",
              executionStatus.overallStatus === "failed" &&
                "bg-red-50 border-red-300",
              executionStatus.overallStatus === "idle" &&
                "bg-muted/50 border-muted"
            )}
          >
            {/* Progress bar */}
            <Progress
              value={progressValue}
              className={cn(
                "h-2",
                executionStatus.overallStatus === "running" &&
                  "[&>div]:bg-lime-500",
                executionStatus.overallStatus === "success" &&
                  "[&>div]:bg-blue-500",
                executionStatus.overallStatus === "failed" &&
                  "[&>div]:bg-red-500"
              )}
            />

            {/* Status text */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  {executionStatus.overallStatus === "running" && (
                    <>
                      <Loader2 className="size-3 animate-spin text-lime-600" />
                      <span className="text-lime-700">
                        {executionStatus.currentWorkflowName
                          ? `Workflow: ${executionStatus.currentWorkflowName}`
                          : "Starting..."}
                      </span>
                    </>
                  )}
                  {executionStatus.overallStatus === "success" && (
                    <>
                      <CheckCircle2 className="size-3 text-blue-600" />
                      <span className="text-blue-700">
                        All workflows completed
                      </span>
                    </>
                  )}
                  {executionStatus.overallStatus === "failed" && (
                    <>
                      <XCircle className="size-3 text-red-600" />
                      <span className="text-red-700">
                        {executionStatus.failedWorkflowName
                          ? `Failed: ${executionStatus.failedWorkflowName}`
                          : "Execution failed"}
                      </span>
                    </>
                  )}
                  {executionStatus.overallStatus === "idle" && (
                    <>
                      <Loader2 className="size-3 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Starting...</span>
                    </>
                  )}
                </div>
                {/* Current node info */}
                {executionStatus.overallStatus === "running" &&
                  executionStatus.currentNode && (
                    <div className="text-lime-600 ml-5">
                      Node: {executionStatus.currentNode.nodeName}
                      {executionStatus.nodeProgress && (
                        <span className="ml-2">
                          ({executionStatus.nodeProgress.completed}/
                          {executionStatus.nodeProgress.total} nodes)
                        </span>
                      )}
                    </div>
                  )}
              </div>
              <span
                className={cn(
                  executionStatus.overallStatus === "running" &&
                    "text-lime-600",
                  executionStatus.overallStatus === "success" &&
                    "text-blue-600",
                  executionStatus.overallStatus === "failed" && "text-red-600",
                  executionStatus.overallStatus === "idle" &&
                    "text-muted-foreground"
                )}
              >
                {executionStatus.counts.success + executionStatus.counts.failed}
                /{executionStatus.counts.total} workflows
              </span>
            </div>

            {/* Error message */}
            {executionStatus.overallStatus === "failed" && (
              <div className="text-xs text-red-600 space-y-1">
                {executionStatus.failedNodeName && (
                  <div>Failed at node: {executionStatus.failedNodeName}</div>
                )}
                {executionStatus.errorMessage && (
                  <div className="truncate">
                    Error: {executionStatus.errorMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </EntityItem>
  );
};
