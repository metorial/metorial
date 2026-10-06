import { z } from 'zod';

export const pageInput = {
  pageUrl: z
    .string()
    .optional()
    .describe(
      'Next-page URL from a previous result. Keep the same organization or project and account endpoint; other paging and filter options are ignored when continuing.'
    )
};
export const pageOutput = {
  nextPageUrl: z
    .string()
    .optional()
    .describe('Provider URL for the next page, when more results exist'),
  totalCount: z
    .number()
    .optional()
    .describe('Total matching results reported by the provider'),
  rateLimitRemaining: z
    .number()
    .optional()
    .describe('Requests remaining in the current rate-limit window')
};
