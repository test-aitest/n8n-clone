import { useQueryStates } from "nuqs";
import { projectsParams } from "../params";

export const useProjectsParams = () => {
  return useQueryStates(projectsParams);
};
