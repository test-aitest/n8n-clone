import { useTRPC } from "@/trpc/client";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { useProjectsParams } from "./use-projects-params";

/**
 * Hook to fetch all projects using suspense
 */
export const useSuspenseProjects = () => {
  const trpc = useTRPC();
  const [params] = useProjectsParams();

  return useSuspenseQuery(trpc.projects.list.queryOptions(params));
};

/**
 * Hook to fetch a single project using suspense
 */
export const useSuspenseProject = (id: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.projects.get.queryOptions({ id }));
};

/**
 * Hook to create a new project
 */
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Project "${data.name}" created`);
        queryClient.invalidateQueries(trpc.projects.list.queryOptions({}));
      },
      onError: (error) => {
        toast.error(`Failed to create project: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to update a project
 */
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.projects.update.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Project "${data.name}" updated`);
        queryClient.invalidateQueries(trpc.projects.list.queryOptions({}));
        queryClient.invalidateQueries(
          trpc.projects.get.queryOptions({ id: data.id }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to update project: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to remove a project
 */
export const useRemoveProject = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.projects.delete.mutationOptions({
      onSuccess: (data) => {
        toast.success(`Project "${data.name}" removed`);
        queryClient.invalidateQueries(trpc.projects.list.queryOptions({}));
        queryClient.invalidateQueries(
          trpc.projects.get.queryFilter({ id: data.id }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to remove project: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to rescan a project
 */
export const useRescanProject = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.projects.rescan.mutationOptions({
      onSuccess: (data, variables) => {
        toast.success(
          `Project rescanned: ${data.swiftUIFileCount} SwiftUI files found`,
        );
        queryClient.invalidateQueries(
          trpc.projects.get.queryOptions({ id: variables.id }),
        );
      },
      onError: (error) => {
        toast.error(`Failed to rescan project: ${error.message}`);
      },
    }),
  );
};

/**
 * Hook to detect Xcode project at a path
 * Note: detectProject is a query, use with useQuery/useLazyQuery
 */
export const useDetectProjectQuery = (directoryPath: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(
    trpc.projects.detectProject.queryOptions({ directoryPath })
  );
};

/**
 * Hook to list simulators
 */
export const useListSimulators = () => {
  const trpc = useTRPC();
  return useSuspenseQuery(trpc.projects.listSimulators.queryOptions());
};

/**
 * Hook to fetch UI components for a project
 */
export const useUIComponents = (
  projectId: string,
  options?: {
    componentType?: string | null;
    sourceFilePath?: string | null;
  }
) => {
  const trpc = useTRPC();
  return useSuspenseQuery(
    trpc.projects.getUIComponents.queryOptions({
      projectId,
      componentType: options?.componentType,
      sourceFilePath: options?.sourceFilePath,
    })
  );
};

/**
 * Hook to fetch project screens
 */
export const useProjectScreens = (projectId: string) => {
  const trpc = useTRPC();
  return useSuspenseQuery(
    trpc.projectScreens.getMany.queryOptions({ projectId })
  );
};

/**
 * Hook to update screen name
 */
export const useUpdateScreenName = () => {
  const queryClient = useQueryClient();
  const trpc = useTRPC();

  return useMutation(
    trpc.projectScreens.upsert.mutationOptions({
      onSuccess: (_data, variables) => {
        toast.success("Screen name updated");
        queryClient.invalidateQueries(
          trpc.projectScreens.getMany.queryOptions({ projectId: variables.projectId })
        );
        queryClient.invalidateQueries(
          trpc.projects.getUIComponents.queryOptions({ projectId: variables.projectId })
        );
      },
      onError: (error) => {
        toast.error(`Failed to update screen name: ${error.message}`);
      },
    })
  );
};
