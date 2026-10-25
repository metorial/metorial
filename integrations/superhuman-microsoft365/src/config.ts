import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    tenantId: z
      .string()
      .optional()
      .describe(
        'Microsoft Entra tenant ID or verified domain where an administrator grants consent for the "Work Only" sign-in. It does not change the sign-in tenant. Defaults to "organizations".'
      )
  })
);
