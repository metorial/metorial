import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    propertyId: z
      .string()
      .optional()
      .describe(
        'Default property ID to use for API requests. If not set, operations may require a property ID as input.'
      )
  })
);
