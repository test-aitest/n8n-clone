import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.projects.list>;

/**
 * Prefetch all projects
 */
export const prefetchProjects = (params: Input) => {
  return prefetch(trpc.projects.list.queryOptions(params));
};

/**
 * Prefetch a single project
 */
export const prefetchProject = (id: string) => {
  return prefetch(trpc.projects.get.queryOptions({ id }));
};

/**
 * Prefetch simulators list
 */
export const prefetchSimulators = () => {
  return prefetch(trpc.projects.listSimulators.queryOptions());
};
