import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'The Eventbrite organization ID to scope API requests to. Required for most operations.'
      )
  })
);
