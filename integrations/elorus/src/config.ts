import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'Default organization ID for existing connections. Can be supplied on each tool. Found in Elorus under Settings > Organization > Organization ID.'
      )
  })
);
