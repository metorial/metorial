import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .describe(
        'Your Firmao organization identifier, visible in the URL after logging in (e.g., the part after system.firmao.net/)'
      )
  })
);
