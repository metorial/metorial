import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    tenantId: {
      schema: z
        .string()
        .optional()
        .describe('Microsoft Entra tenant ID. Defaults to "common" for multi-tenant apps.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
