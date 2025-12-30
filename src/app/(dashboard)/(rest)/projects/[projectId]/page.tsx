import { ProjectDetail } from "@/features/projects/components/project-detail";
import { prefetchProject } from "@/features/projects/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Loader2 } from "lucide-react";

type Props = {
  params: Promise<{ projectId: string }>;
};

const ProjectLoading = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="size-8 animate-spin text-muted-foreground" />
  </div>
);

const ProjectError = () => (
  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
    <p>Error loading project</p>
  </div>
);

const Page = async ({ params }: Props) => {
  await requireAuth();

  const { projectId } = await params;
  prefetchProject(projectId);

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<ProjectError />}>
        <Suspense fallback={<ProjectLoading />}>
          <ProjectDetail projectId={projectId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
