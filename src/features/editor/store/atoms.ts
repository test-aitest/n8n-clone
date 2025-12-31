import type { ReactFlowInstance } from "@xyflow/react";
import { atom } from "jotai";

export const editorAtom = atom<ReactFlowInstance | null>(null);

// Current workflow context for node dialogs
export interface WorkflowContext {
  workflowId: string;
  projectId: string | null;
}

export const workflowContextAtom = atom<WorkflowContext | null>(null);
