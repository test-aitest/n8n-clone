"use client";

import {
  EmptyView,
  EntityContainer,
  EntityHeader,
  EntityList,
  EntitySearch,
  ErrorView,
  LoadingView,
} from "@/components/entity-components";
import { useSuspenseTemplates } from "../hooks/use-templates";
import { useTemplatesParams } from "../hooks/use-templates-params";
import { useEntitySearch } from "@/hooks/use-entity-search";
import { FileTextIcon, SparklesIcon } from "lucide-react";
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
  const [params, setParams] = useTemplatesParams();

  const handleCloseDialog = () => {
    setParams({ ...params, selected: "" });
  };

  return (
    <>
      <EntityList
        items={templates.data as TemplateData[]}
        getKey={(template) => template.id}
        renderItem={(template) => <TemplateItem data={template} />}
        emptyView={<TemplatesEmpty />}
      />
      <TemplateSelectDialog
        open={!!params.selected}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog();
        }}
        preSelectedTemplateId={params.selected || undefined}
      />
    </>
  );
};

export const TemplatesHeader = () => {
  return (
    <EntityHeader
      title="Templates"
      description="Reusable workflow templates for iOS testing"
    />
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
  return <TemplateItemCard data={data} />;
};

// Custom template item that navigates via URL
const TemplateItemCard = ({
  data,
}: {
  data: TemplateData;
}) => {
  const [, setParams] = useTemplatesParams();

  const handleClick = () => {
    setParams((prev) => ({ ...prev, selected: data.id }));
  };

  return (
    <div
      onClick={handleClick}
      className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 size-9 flex items-center justify-center rounded-md bg-muted">
          <FileTextIcon className="size-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{data.name}</span>
            {data.isDefault && (
              <Badge variant="secondary" className="text-xs">
                <SparklesIcon className="size-3 mr-1" />
                Default
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {data.description || "No description"}
          </div>
          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {data.tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{data.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
