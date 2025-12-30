import {
  ProjectsContainer,
  ProjectsList,
  ProjectsLoading,
  ProjectsError,
} from "@/features/projects/components/projects";
import { projectsParamsLoader } from "@/features/projects/server/params-loader";
import { prefetchProjects } from "@/features/projects/server/prefetch";
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

  const params = await projectsParamsLoader(searchParams);
  prefetchProjects(params);

  return (
    <ProjectsContainer>
      <HydrateClient>
        <ErrorBoundary fallback={<ProjectsError />}>
          <Suspense fallback={<ProjectsLoading />}>
            <ProjectsList />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </ProjectsContainer>
  );
};

export default Page;
