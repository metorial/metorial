import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    tenantId: z
      .string()
      .min(1)
      .describe('Visma Net tenant/company ID for the connected account.'),
    defaultBranch: z
      .string()
      .optional()
      .describe('Optional default branch code for tools whose endpoint accepts branch.'),
    defaultPageSize: z
      .number()
      .int()
      .min(1)
      .max(500)
      .optional()
      .describe(
        'Optional default page size for list tools. Visma documents max page sizes per endpoint; this integration caps the default at 500.'
      )
  })
);
