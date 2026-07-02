import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    tenantId: z
      .string()
      .optional()
      .describe(
        'Azure AD tenant ID. Defaults to "common" for multi-tenant apps. Use a specific tenant ID to restrict access to a single organization.'
      )
  })
);
