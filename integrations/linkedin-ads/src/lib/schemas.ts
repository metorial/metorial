import { z } from 'zod';
export const accountIdField = z
  .string()
  .describe(
    'Ad account ID or sponsoredAccount URN. Call list_ad_accounts to discover authorized account IDs.'
  );
