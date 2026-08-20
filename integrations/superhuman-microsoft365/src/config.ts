import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    tenantId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Microsoft Entra tenant ID. Use "common" for multi-tenant + personal accounts, "organizations" for work/school only, or a specific tenant ID for single-org apps. Defaults to "common".'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
