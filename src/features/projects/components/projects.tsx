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
  useRemoveProject,
  useSuspenseProjects,
} from "../hooks/use-projects";
import { useProjectsParams } from "../hooks/use-projects-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import { FolderIcon } from "lucide-react";
import { useState } from "react";
import { ProjectCreateDialog } from "./project-create-dialog";

interface ProjectData {
  id: string;
  name: string;
  projectPath: string;
  bundleId: string | null;
  targetDeviceId: string | null;
  appPath: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    workflows: number;
    templates: number;
    uiComponents: number;
  };
}

export const ProjectsSearch = () => {
  const [params, setParams] = useProjectsParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search projects"
    />
  );
};

export const ProjectsList = () => {
  const projects = useSuspenseProjects();

  return (
    <EntityList
      items={projects.data.items as ProjectData[]}
      getKey={(project) => project.id}
      renderItem={(project) => <ProjectItem data={project} />}
      emptyView={<ProjectsEmpty />}
    />
  );
};

export const ProjectsHeader = ({ disabled }: { disabled?: boolean }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <EntityHeader
        title="Projects"
        description="Manage your iOS test projects"
        onNew={() => setIsDialogOpen(true)}
        newButtonLabel="New project"
        disabled={disabled}
      />
      <ProjectCreateDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
};

export const ProjectsPagination = () => {
  const projects = useSuspenseProjects();
  const [params, setParams] = useProjectsParams();

  return (
    <EntityPagination
      disabled={projects.isFetching}
      totalPages={projects.data.totalPages}
      page={projects.data.page}
      onPageChange={(page) => setParams({ ...params, page })}
    />
  );
};

export const ProjectsContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={<ProjectsHeader />}
      search={<ProjectsSearch />}
      pagination={<ProjectsPagination />}
    >
      {children}
    </EntityContainer>
  );
};

export const ProjectsLoading = () => {
  return <LoadingView message="Loading projects..." />;
};

export const ProjectsError = () => {
  return <ErrorView message="Error loading projects" />;
};

export const ProjectsEmpty = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <EmptyView
        onNew={() => setIsDialogOpen(true)}
        message="You haven't created any projects yet. Get started by adding your first Xcode project"
      />
      <ProjectCreateDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
};

export const ProjectItem = ({ data }: { data: ProjectData }) => {
  const removeProject = useRemoveProject();

  const handleRemove = () => {
    removeProject.mutate({ id: data.id });
  };

  return (
    <EntityItem
      href={`/projects/${data.id}`}
      title={data.name}
      subtitle={`${data._count.workflows} workflows · ${data._count.uiComponents} components · Updated ${formatDistanceToNow(data.updatedAt, { addSuffix: true })}`}
      image={<FolderIcon className="size-4 text-muted-foreground" />}
      onRemove={handleRemove}
      isRemoving={removeProject.isPending}
    />
  );
};
