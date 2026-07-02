import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .describe(
        'The Organization ID. Found in Elorus under Settings > Organization > Organization ID.'
      )
  })
);
