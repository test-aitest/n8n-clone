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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useCreateWorkflowFromTemplate } from "../hooks/use-templates";
import { Loader2, FileTextIcon, CheckIcon, SparklesIcon } from "lucide-react";

interface TemplateSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
}

export function TemplateSelectDialog({
  open,
  onOpenChange,
  projectId: initialProjectId,
}: TemplateSelectDialogProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const createWorkflow = useCreateWorkflowFromTemplate();

  const [step, setStep] = useState<"select" | "configure">("select");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>(initialProjectId || "");
  const [workflowName, setWorkflowName] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({});

  // Fetch projects
  const projectsQuery = useQuery(
    trpc.projects.list.queryOptions({ pageSize: 100 })
  );

  // Fetch templates (defaults + project-specific)
  const templatesQuery = useQuery(
    trpc.templates.list.queryOptions({
      projectId: projectId || undefined,
    })
  );

  // Fetch template variables when selected
  const templateVariablesQuery = useQuery({
    ...trpc.templates.getVariables.queryOptions({ id: selectedTemplateId }),
    enabled: !!selectedTemplateId && step === "configure",
  });

  // Get selected template details from list
  const selectedTemplate = templatesQuery.data?.find(
    (t) => t.id === selectedTemplateId
  );

  const handleSelectTemplate = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templatesQuery.data?.find((t) => t.id === templateId);
    if (template) {
      setWorkflowName(`${template.name} - New`);
    }
    setStep("configure");
  };

  // Update variables when template variables are fetched
  const handleVariablesLoaded = () => {
    if (templateVariablesQuery.data) {
      const { variables: varNames, defaults } = templateVariablesQuery.data;
      const initialVars: Record<string, string> = {};
      for (const v of varNames) {
        initialVars[v] = defaults[v] || "";
      }
      setVariables(initialVars);
    }
  };

  // Call when variables are loaded
  if (templateVariablesQuery.data && Object.keys(variables).length === 0) {
    handleVariablesLoaded();
  }

  const handleCreate = () => {
    if (!selectedTemplateId || !projectId || !workflowName.trim()) return;

    createWorkflow.mutate(
      {
        templateId: selectedTemplateId,
        projectId,
        name: workflowName.trim(),
        variables,
      },
      {
        onSuccess: (data) => {
          onOpenChange(false);
          router.push(`/workflows/${data.id}`);
        },
      }
    );
  };

  const handleBack = () => {
    setStep("select");
    setSelectedTemplateId("");
    setVariables({});
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("select");
    setSelectedTemplateId("");
    setVariables({});
    setWorkflowName("");
  };

  const variableKeys = Object.keys(variables);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>
            {step === "select" ? "Select Template" : "Configure Workflow"}
          </DialogTitle>
          <DialogDescription>
            {step === "select"
              ? "Choose a template to create a new iOS test workflow"
              : "Configure the workflow settings and variables"}
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="grid gap-4 py-4">
            {/* Project Selection */}
            <div className="grid gap-2">
              <Label htmlFor="project">Project</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projectsQuery.data?.items?.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select a project to see available templates
              </p>
            </div>

            {/* Template List */}
            <div className="grid gap-2">
              <Label>Templates</Label>
              <ScrollArea className="h-72 border rounded-md p-2">
                {templatesQuery.isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                ) : templatesQuery.data?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <FileTextIcon className="size-8 mb-2" />
                    <span>No templates available</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {templatesQuery.data?.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleSelectTemplate(template.id)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors hover:bg-accent ${
                          selectedTemplateId === template.id
                            ? "border-primary bg-accent"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{template.name}</span>
                              {template.isDefault && (
                                <Badge variant="secondary" className="text-xs">
                                  <SparklesIcon className="size-3 mr-1" />
                                  Default
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {template.description || "No description"}
                            </p>
                            {template.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.tags.map((tag) => (
                                  <Badge
                                    key={tag}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          {selectedTemplateId === template.id && (
                            <CheckIcon className="size-4 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
        )}

        {step === "configure" && selectedTemplate && (
          <div className="grid gap-4 py-4">
            {/* Workflow Name */}
            <div className="grid gap-2">
              <Label htmlFor="workflowName">Workflow Name</Label>
              <Input
                id="workflowName"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                placeholder="My Test Workflow"
              />
            </div>

            {/* Template Variables */}
            {variableKeys.length > 0 && (
              <div className="grid gap-2">
                <Label>Template Variables</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Fill in the values for template variables
                </p>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {variableKeys.map((key) => (
                    <div key={key} className="grid gap-1">
                      <Label htmlFor={key} className="text-sm font-normal">
                        {key}
                      </Label>
                      <Input
                        id={key}
                        value={variables[key]}
                        onChange={(e) =>
                          setVariables((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        placeholder={`Enter ${key}`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Template Info */}
            <div className="rounded-lg bg-muted p-3">
              <div className="text-sm font-medium">
                Template: {selectedTemplate.name}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {selectedTemplate.description || "No description"}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "configure" && (
            <Button variant="outline" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {step === "select" && (
            <Button
              onClick={() => {
                if (selectedTemplateId) {
                  handleSelectTemplate(selectedTemplateId);
                }
              }}
              disabled={!selectedTemplateId || !projectId}
            >
              Next
            </Button>
          )}
          {step === "configure" && (
            <Button
              onClick={handleCreate}
              disabled={!workflowName.trim() || createWorkflow.isPending}
            >
              {createWorkflow.isPending && (
                <Loader2 className="size-4 mr-2 animate-spin" />
              )}
              Create Workflow
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
