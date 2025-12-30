"use client";

import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useTemplatesParams } from "./use-templates-params";

export const useSuspenseTemplates = () => {
  const trpc = useTRPC();
  const [params] = useTemplatesParams();

  return useSuspenseQuery(
    trpc.templates.list.queryOptions({
      search: params.search || undefined,
      category: (params.category as "default" | "custom" | "all") || undefined,
      projectId: params.projectId || undefined,
    })
  );
};

export const useSuspenseTemplate = (id: string) => {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.templates.get.queryOptions({ id }));
};

export const useCreateWorkflowFromTemplate = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.templates.createWorkflowFromTemplate.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["workflows"]] });
      },
    })
  );
};

export const useCreateTemplateFromWorkflow = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.templates.createFromWorkflow.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["templates"]] });
      },
    })
  );
};

export const useRemoveTemplate = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.templates.delete.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [["templates"]] });
      },
    })
  );
};
