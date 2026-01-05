"use client";

import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { usePackagesParams } from "./use-packages-params";

/**
 * Hook to fetch all packages for a project using suspense
 */
export const useSuspensePackages = (projectId: string) => {
  const trpc = useTRPC();
  const [params] = usePackagesParams();

  return useSuspenseQuery(
    trpc.packages.getMany.queryOptions({
      ...params,
      projectId,
    })
  );
};

/**
 * Hook to fetch packages (non-suspense)
 */
export const usePackages = (projectId: string) => {
  const trpc = useTRPC();
  const [params] = usePackagesParams();

  return useQuery(
    trpc.packages.getMany.queryOptions({
      ...params,
      projectId,
    })
  );
};

/**
 * Hook to fetch a single package using suspense
 */
export const useSuspensePackage = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.packages.getOne.queryOptions({ id }));
};

/**
 * Hook to create a new package
 */
export const useCreatePackage = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.packages.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Package "${data.name}" created`);
        queryClient.invalidateQueries({ queryKey: [["packages"]] });
      },
      onError: (error) => {
        toast.error(`Failed to create package: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to update a package
 */
export const useUpdatePackage = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.packages.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Package "${data.name}" updated`);
        queryClient.invalidateQueries({ queryKey: [["packages"]] });
      },
      onError: (error) => {
        toast.error(`Failed to update package: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to delete a package
 */
export const useDeletePackage = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.packages.delete.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Package "${data.name}" deleted`);
        queryClient.invalidateQueries({ queryKey: [["packages"]] });
      },
      onError: (error) => {
        toast.error(`Failed to delete package: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to add a workflow to a package
 */
export const useAddWorkflowToPackage = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.packages.addWorkflow.mutationOptions({
      onSuccess: () => {
        toast.success("Workflow added to package");
        queryClient.invalidateQueries({ queryKey: [["packages"]] });
      },
      onError: (error) => {
        toast.error(`Failed to add workflow: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to remove a workflow from a package
 */
export const useRemoveWorkflowFromPackage = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.packages.removeWorkflow.mutationOptions({
      onSuccess: () => {
        toast.success("Workflow removed from package");
        queryClient.invalidateQueries({ queryKey: [["packages"]] });
      },
      onError: (error) => {
        toast.error(`Failed to remove workflow: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to execute a package
 */
export const useExecutePackage = () => {
  const trpc = useTRPC();

  return useMutation(
    trpc.packages.execute.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Package "${data.name}" execution started`);
      },
      onError: (error) => {
        toast.error(`Failed to execute package: ${error.message}`);
      },
    })
  );
};

/**
 * Hook to validate parallel execution
 */
export const useValidateParallel = (packageId: string, enabled = true) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.packages.validateParallel.queryOptions({ packageId }),
    enabled,
  });
};
