import { useQueryStates } from "nuqs";
import { packagesParams } from "../params";

export const usePackagesParams = () => {
  return useQueryStates(packagesParams);
};
