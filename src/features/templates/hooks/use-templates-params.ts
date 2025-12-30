"use client";

import { useQueryStates } from "nuqs";
import { templatesParams } from "../params";

export const useTemplatesParams = () => {
  return useQueryStates(templatesParams);
};
