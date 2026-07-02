import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    tenantId: z
      .string()
      .optional()
      .describe(
        'Xero organisation (tenant) ID. Required for multi-tenant OAuth apps. If not set, the first connected organisation will be used. Custom Connections do not require this value.'
      )
  })
);
