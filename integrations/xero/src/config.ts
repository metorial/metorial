import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    tenantId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Xero organisation (tenant) ID. Required for multi-tenant OAuth apps. If not set, the first connected organisation will be used. Custom Connections do not require this value.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
