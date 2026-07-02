import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .describe(
        'Zoho Inventory Organization ID. Retrieve from the Organizations API after authenticating.'
      )
  })
);
