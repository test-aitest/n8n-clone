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
import { PackageIcon, Play, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { ExecutionMode } from "@/generated/prisma/browser";

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

  const handleRemove = () => {
    deletePackage.mutate({ id: data.id });
  };

  const handleExecute = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    executePackage.mutate({ id: data.id });
  };

  // Check for duplicate simulator IDs
  const deviceIds = data.workflows
    .map((pw) => pw.workflow.targetDeviceId)
    .filter(Boolean);
  const hasDuplicateDevices =
    data.executionMode === "PARALLEL" &&
    deviceIds.length !== new Set(deviceIds).size;

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
          <Badge variant={data.executionMode === "PARALLEL" ? "default" : "secondary"} className="text-xs">
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
            data._count.workflows === 0 ||
            hasDuplicateDevices
          }
        >
          <Play className="size-4" />
          Execute
        </Button>
      }
      onRemove={handleRemove}
      isRemoving={deletePackage.isPending}
    />
  );
};
