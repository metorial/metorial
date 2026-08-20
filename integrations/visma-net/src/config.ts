import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    tenantId: {
      schema: z
        .string()
        .min(1)
        .describe('Visma Net tenant/company ID for the connected account.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultBranch: {
      schema: z
        .string()
        .optional()
        .describe('Optional default branch code for tools whose endpoint accepts branch.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    defaultPageSize: {
      schema: z
        .number()
        .int()
        .min(1)
        .max(500)
        .optional()
        .describe(
          'Optional default page size for list tools. Visma documents max page sizes per endpoint; this integration caps the default at 500.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
