export type QueryOptions = {
  top?: number;
  skip?: number;
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  inlineCount?: boolean;
  nextPage?: string;
  asOfDate?: string;
  fromDate?: string;
  toDate?: string;
};
export type Page = {
  results: Record<string, unknown>[];
  count?: number;
  nextLink?: string;
  hasMore: boolean;
};
