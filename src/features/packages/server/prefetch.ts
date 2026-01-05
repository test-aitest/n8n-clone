import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.packages.getMany>;

/**
 * Prefetch all packages for a project
 */
export const prefetchPackages = (params: Input) => {
  return prefetch(trpc.packages.getMany.queryOptions(params));
};

/**
 * Prefetch a single package
 */
export const prefetchPackage = (id: string) => {
  return prefetch(trpc.packages.getOne.queryOptions({ id }));
};
