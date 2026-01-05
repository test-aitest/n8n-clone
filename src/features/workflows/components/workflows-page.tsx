"use client";

import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  WorkflowsList,
  WorkflowsLoading,
  WorkflowsError,
  WorkflowsSearch,
  WorkflowsHeader,
  WorkflowsPagination,
} from "./workflows";
import {
  PackagesList,
  PackagesLoading,
  PackagesError,
  PackagesSearch,
  PackagesHeader,
  PackagesPagination,
} from "@/features/packages/components/packages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

export const WorkflowsPage = () => {
  const [activeTab, setActiveTab] = useState<"workflows" | "packages">("workflows");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  const trpc = useTRPC();
  const projectsQuery = useQuery(
    trpc.projects.list.queryOptions({ page: 1, pageSize: 100 })
  );

  return (
    <div className="p-4 md:px-10 md:py-6 h-full">
      <div className="mx-auto max-w-7xl w-full flex flex-col gap-y-6 h-full">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "workflows" | "packages")}
        >
          <TabsList>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="packages">Packages</TabsTrigger>
          </TabsList>

          <TabsContent value="workflows" className="mt-6">
            <div className="flex flex-col gap-y-8 h-full">
              <WorkflowsHeader />
              <div className="flex flex-col gap-y-4 h-full">
                <WorkflowsSearch />
                <ErrorBoundary fallback={<WorkflowsError />}>
                  <Suspense fallback={<WorkflowsLoading />}>
                    <WorkflowsList />
                  </Suspense>
                </ErrorBoundary>
              </div>
              <WorkflowsPagination />
            </div>
          </TabsContent>

          <TabsContent value="packages" className="mt-6">
            <div className="flex flex-col gap-y-8 h-full">
              {/* Project Selector */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Project:</span>
                {projectsQuery.isLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Select
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projectsQuery.data?.items.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedProjectId ? (
                <div className="flex flex-col gap-y-8 h-full">
                  <PackagesHeader projectId={selectedProjectId} />
                  <div className="flex flex-col gap-y-4 h-full">
                    <PackagesSearch />
                    <ErrorBoundary fallback={<PackagesError />}>
                      <Suspense fallback={<PackagesLoading />}>
                        <PackagesList projectId={selectedProjectId} />
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                  <PackagesPagination projectId={selectedProjectId} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <p>Select a project to view its packages</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
