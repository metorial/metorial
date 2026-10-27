import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    tenantId: z
      .string()
      .describe(
        'Microsoft Entra tenant ID or verified domain where an administrator grants consent. Users still sign in through "common". Found in the Azure portal under App registrations.'
      )
  })
);
