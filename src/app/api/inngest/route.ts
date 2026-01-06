import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import {
  executeWorkflow,
  handleScheduleUpdated,
  executeScheduledWorkflow,
  executePackage,
} from "@/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    executeWorkflow,
    handleScheduleUpdated,
    executeScheduledWorkflow,
    executePackage,
  ],
});
