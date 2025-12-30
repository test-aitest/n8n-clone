"use client";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityItem,
  EntityList,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import {
  useRemoveTemplate,
  useSuspenseTemplates,
} from "../hooks/use-templates";
import { useTemplatesParams } from "../hooks/use-templates-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import { FileTextIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { TemplateSelectDialog } from "./template-select-dialog";
import { Badge } from "@/components/ui/badge";

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  projectId: string | null;
  isDefault: boolean;
}

export const TemplatesSearch = () => {
  const [params, setParams] = useTemplatesParams();
  const { searchValue, onSearchChange } = useEntitySearch({
    params,
    setParams,
  });

  return (
    <EntitySearch
      value={searchValue}
      onChange={onSearchChange}
      placeholder="Search templates"
    />
  );
};

export const TemplatesList = () => {
  const templates = useSuspenseTemplates();

  return (
    <EntityList
      items={templates.data as TemplateData[]}
      getKey={(template) => template.id}
      renderItem={(template) => <TemplateItem data={template} />}
      emptyView={<TemplatesEmpty />}
    />
  );
};

export const TemplatesHeader = ({ disabled }: { disabled?: boolean }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <EntityHeader
        title="Templates"
        description="Reusable workflow templates for iOS testing"
        onNew={() => setIsDialogOpen(true)}
        newButtonLabel="Use template"
        disabled={disabled}
      />
      <TemplateSelectDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
};

export const TemplatesContainer = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <EntityContainer
      header={<TemplatesHeader />}
      search={<TemplatesSearch />}
    >
      {children}
    </EntityContainer>
  );
};

export const TemplatesLoading = () => {
  return <LoadingView message="Loading templates..." />;
};

export const TemplatesError = () => {
  return <ErrorView message="Error loading templates" />;
};

export const TemplatesEmpty = () => {
  return (
    <EmptyView
      message="No templates found. Create a workflow and save it as a template to get started."
    />
  );
};

export const TemplateItem = ({ data }: { data: TemplateData }) => {
  const removeTemplate = useRemoveTemplate();

  const handleRemove = () => {
    // Only allow removing custom templates
    if (!data.isDefault) {
      removeTemplate.mutate({ id: data.id });
    }
  };

  return (
    <EntityItem
      href={`/templates?selected=${data.id}`}
      title={data.name}
      subtitle={
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {data.isDefault && (
              <Badge variant="secondary" className="text-xs">
                <SparklesIcon className="size-3 mr-1" />
                Default
              </Badge>
            )}
          </div>
          <span>{data.description || "No description"}</span>
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      }
      image={
        <div className="size-8 flex items-center justify-center">
          <FileTextIcon className="size-5 text-muted-foreground" />
        </div>
      }
      onRemove={data.isDefault ? undefined : handleRemove}
      isRemoving={removeTemplate.isPending}
    />
  );
};
