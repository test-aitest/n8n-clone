"use client";

import { useState, useEffect } from "react";
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
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { useCreateWorkflowFromTemplate } from "../hooks/use-templates";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { UIComponentSelector } from "./ui-component-selector";
import { DeviceSelector } from "@/features/ios-testing/components/device-selector";
import { Badge } from "@/components/ui/badge";
import { getNodeTypeLabel } from "../lib/template-variables";

// Variables that should use UIComponentSelector
const UI_COMPONENT_VARIABLES = [
  "buttonId",
  "targetScreenId",
  "elementId",
  "textFieldId",
  "submitButtonId",
  "resultId",
  "emailFieldId",
  "passwordFieldId",
  "loginButtonId",
  "homeScreenId",
  "listId",
  "itemId",
  "toggleId",
  "sliderId",
  "pickerId",
  "accessibilityId",
];

interface TemplateSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  preSelectedTemplateId?: string;
}

export function TemplateSelectDialog({
  open,
  onOpenChange,
  projectId: initialProjectId,
  preSelectedTemplateId,
}: TemplateSelectDialogProps) {
  const trpc = useTRPC();
  const createWorkflow = useCreateWorkflowFromTemplate();

  const [projectId, setProjectId] = useState<string>(initialProjectId || "");
  const [workflowName, setWorkflowName] = useState<string>("");
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch projects
  const projectsQuery = useQuery(
    trpc.projects.list.queryOptions({ pageSize: 100 })
  );

  // Fetch template details when pre-selected
  const templateQuery = useQuery({
    ...trpc.templates.get.queryOptions({ id: preSelectedTemplateId || "" }),
    enabled: !!preSelectedTemplateId,
  });

  // Fetch template variables
  const templateVariablesQuery = useQuery({
    ...trpc.templates.getVariables.queryOptions({ id: preSelectedTemplateId || "" }),
    enabled: !!preSelectedTemplateId,
  });

  // Initialize workflow name and variables when template is loaded
  useEffect(() => {
    if (templateQuery.data && !isInitialized && open) {
      setWorkflowName(`${templateQuery.data.name} - New`);
      setIsInitialized(true);
    }
  }, [templateQuery.data, isInitialized, open]);

  // Update variables when template variables are fetched
  useEffect(() => {
    if (templateVariablesQuery.data && Object.keys(variables).length === 0 && open) {
      const { variables: varNames, defaults } = templateVariablesQuery.data;
      const initialVars: Record<string, string> = {};
      for (const v of varNames) {
        initialVars[v] = defaults[v] || "";
      }
      setVariables(initialVars);
    }
  }, [templateVariablesQuery.data, variables, open]);

  const handleCreate = () => {
    if (!preSelectedTemplateId || !projectId || !workflowName.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    createWorkflow.mutate(
      {
        templateId: preSelectedTemplateId,
        projectId,
        name: workflowName.trim(),
        variables,
      },
      {
        onSuccess: (data) => {
          toast.success(`Workflow "${data.name}" created`);
          onOpenChange(false);
          // Use window.location for reliable navigation after mutation
          window.location.href = `/workflows/${data.id}`;
        },
        onError: (error) => {
          toast.error(`Failed to create workflow: ${error.message}`);
        },
      }
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    setVariables({});
    setWorkflowName("");
    setIsInitialized(false);
  };

  const variableKeys = Object.keys(variables);
  const isLoading = templateQuery.isLoading || templateVariablesQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>Use Template</DialogTitle>
          <DialogDescription>
            Configure the workflow settings for this template
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 py-4 overflow-y-auto flex-1 pr-2">
            {/* Template Info */}
            {templateQuery.data && (
              <div className="rounded-lg bg-muted p-3">
                <div className="text-sm font-medium">
                  {templateQuery.data.name}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {templateQuery.data.description || "No description"}
                </div>
              </div>
            )}

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
                Select a project to apply device and app settings
              </p>
            </div>

            {/* Simulator Selection */}
            {variableKeys.includes("deviceId") && (() => {
              const deviceIdUsage = templateVariablesQuery.data?.variablesWithUsage?.find(
                (v) => v.variableName === "deviceId"
              );
              const deviceIdNodes = deviceIdUsage?.usedInNodes || [];

              return (
                <div className="grid gap-2 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Simulator (Device ID)</Label>
                    {deviceIdNodes.length > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {deviceIdNodes.length} nodes
                      </Badge>
                    )}
                  </div>
                  {deviceIdNodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {deviceIdNodes.map((node, idx) => (
                        <span
                          key={idx}
                          className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded"
                        >
                          {getNodeTypeLabel(node.nodeType)}
                        </span>
                      ))}
                    </div>
                  )}
                  <DeviceSelector
                    value={variables.deviceId || ""}
                    onChange={(value) =>
                      setVariables((prev) => ({
                        ...prev,
                        deviceId: value,
                      }))
                    }
                    deviceFilter="simulator"
                  />
                </div>
              );
            })()}

            {/* Bundle ID */}
            {variableKeys.includes("bundleId") && (() => {
              const bundleIdUsage = templateVariablesQuery.data?.variablesWithUsage?.find(
                (v) => v.variableName === "bundleId"
              );
              const bundleIdNodes = bundleIdUsage?.usedInNodes || [];

              return (
                <div className="grid gap-2 p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Bundle ID</Label>
                    {bundleIdNodes.length > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {bundleIdNodes.length} nodes
                      </Badge>
                    )}
                  </div>
                  {bundleIdNodes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {bundleIdNodes.map((node, idx) => (
                        <span
                          key={idx}
                          className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded"
                        >
                          {getNodeTypeLabel(node.nodeType)}
                        </span>
                      ))}
                    </div>
                  )}
                  <Input
                    value={variables.bundleId || ""}
                    onChange={(e) =>
                      setVariables((prev) => ({
                        ...prev,
                        bundleId: e.target.value,
                      }))
                    }
                    placeholder="com.example.MyApp"
                  />
                </div>
              );
            })()}

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
                  Fill in the values for each variable. Values are shared across all nodes that use them.
                </p>
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {variableKeys
                    .filter((key) => key !== "deviceId" && key !== "bundleId")
                    .map((key) => {
                      const isUIComponent = UI_COMPONENT_VARIABLES.includes(key);
                      const usage = templateVariablesQuery.data?.variablesWithUsage?.find(
                        (v) => v.variableName === key
                      );
                      const nodeCount = usage?.nodeCount || 0;
                      const usedInNodes = usage?.usedInNodes || [];

                      return (
                        <div key={key} className="grid gap-1.5 p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center justify-between">
                            <Label htmlFor={key} className="text-sm font-medium">
                              {key}
                            </Label>
                            {nodeCount > 1 && (
                              <Badge variant="secondary" className="text-xs">
                                {nodeCount} nodes
                              </Badge>
                            )}
                          </div>
                          {usedInNodes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-1">
                              {usedInNodes.map((node, idx) => (
                                <span
                                  key={idx}
                                  className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded"
                                >
                                  {getNodeTypeLabel(node.nodeType)}
                                </span>
                              ))}
                            </div>
                          )}
                          {isUIComponent ? (
                            <UIComponentSelector
                              value={variables[key]}
                              onChange={(value) =>
                                setVariables((prev) => ({
                                  ...prev,
                                  [key]: value,
                                }))
                              }
                              projectId={projectId || null}
                              placeholder={`Enter ${key}`}
                            />
                          ) : (
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
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!projectId || !workflowName.trim() || createWorkflow.isPending || isLoading}
          >
            {createWorkflow.isPending && (
              <Loader2 className="size-4 mr-2 animate-spin" />
            )}
            Create Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
