import { createTRPCRouter } from "../init";
import { workflowsRouter } from "@/features/workflows/server/routers";
import { credentialsRouter } from "@/features/credentials/server/routers";
import { executionsRouter } from "@/features/executions/server/routers";
import { iosTestingRouter } from "@/features/ios-testing/server/routers";
import { projectsRouter } from "@/features/projects/server/routers";
import { projectScreensRouter } from "@/features/projects/server/screen-routers";
import { templatesRouter } from "@/features/templates/server/routers";
import { packagesRouter } from "@/features/packages/server/routers";

export const appRouter = createTRPCRouter({
  workflows: workflowsRouter,
  credentials: credentialsRouter,
  executions: executionsRouter,
  iosTesting: iosTestingRouter,
  projects: projectsRouter,
  projectScreens: projectScreensRouter,
  templates: templatesRouter,
  packages: packagesRouter,
});

export type AppRouter = typeof appRouter;
