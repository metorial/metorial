import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    tenantId: z
      .string()
      .optional()
      .describe(
        'Azure AD tenant ID. Defaults to "common" which allows any Microsoft account or Azure AD account to sign in. Set to a specific tenant ID to restrict access to a single organization.'
      )
  })
);
