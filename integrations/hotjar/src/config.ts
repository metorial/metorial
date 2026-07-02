import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'Hotjar Organization ID. Found on the Sites & Organizations page. Required for user lookup and deletion operations.'
      )
  })
);
