import type { inferInput } from "@trpc/tanstack-react-query";
import { prefetch, trpc } from "@/trpc/server";

type Input = inferInput<typeof trpc.templates.list>;

/**
 * Prefetch templates list
 */
export const prefetchTemplates = (params: Input) => {
  return prefetch(trpc.templates.list.queryOptions(params));
};

/**
 * Prefetch a single template
 */
export const prefetchTemplate = (id: string) => {
  return prefetch(trpc.templates.get.queryOptions({ id }));
};
