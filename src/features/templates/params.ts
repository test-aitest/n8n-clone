import { parseAsInteger, parseAsString, createSearchParamsCache } from "nuqs/server";

export const templatesParams = {
  search: parseAsString.withDefault(""),
  page: parseAsInteger.withDefault(1),
  category: parseAsString.withDefault(""),
  projectId: parseAsString.withDefault(""),
  selected: parseAsString.withDefault(""),
};

export const templatesParamsCache = createSearchParamsCache(templatesParams);
