import { z } from 'zod';

export let appIdInput = z
  .string()
  .optional()
  .describe(
    'App ID. Call manage_apps with action list to discover app IDs. Overrides the saved config value.'
  );
export let accountIdInput = z
  .string()
  .optional()
  .describe(
    'Account ID. Call who_am_i with Control API Token authentication to discover the account ID. Overrides the saved config value.'
  );
export let pageInput = z
  .string()
  .optional()
  .describe(
    'Opaque nextPageUrl from this same operation. When supplied, the original page query is used and other filters are ignored.'
  );
export let nextPageOutput = z
  .string()
  .optional()
  .describe(
    'Provider pagination URL. Pass unchanged as page to retrieve the next page. Omitted on the last page.'
  );
