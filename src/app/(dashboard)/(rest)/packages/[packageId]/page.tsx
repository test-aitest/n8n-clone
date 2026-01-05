import { PackageDetail } from "@/features/packages/components/package-detail";
import { prefetchPackage } from "@/features/packages/server/prefetch";
import { requireAuth } from "@/lib/auth-utils";
import { HydrateClient } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Loader2 } from "lucide-react";

type Props = {
  params: Promise<{ packageId: string }>;
};

const PackageLoading = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="size-8 animate-spin text-muted-foreground" />
  </div>
);

const PackageError = () => (
  <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
    <p>Error loading package</p>
  </div>
);

const Page = async ({ params }: Props) => {
  await requireAuth();

  const { packageId } = await params;
  prefetchPackage(packageId);

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<PackageError />}>
        <Suspense fallback={<PackageLoading />}>
          <PackageDetail packageId={packageId} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
};

export default Page;
