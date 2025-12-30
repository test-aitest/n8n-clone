import {
  TemplatesContainer,
  TemplatesList,
  TemplatesLoading,
  TemplatesError,
} from "@/features/templates/components/templates";
import { templatesParamsLoader } from "@/features/templates/server/params-loader";
import { prefetchTemplates } from "@/features/templates/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import type { SearchParams } from "nuqs/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

type Props = {
  searchParams: Promise<SearchParams>;
};

const Page = async ({ searchParams }: Props) => {
  await requireAuth();

  const params = await templatesParamsLoader(searchParams);
  prefetchTemplates({
    search: params.search || undefined,
    category: (params.category as "default" | "custom" | "all") || undefined,
    projectId: params.projectId || undefined,
  });

  return (
    <TemplatesContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<TemplatesError />}>
          <Suspense fallback={<TemplatesLoading />}>
            <TemplatesList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </TemplatesContainer>
  );
};

export default Page;
