import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    onBehalfOf: z
      .string()
      .optional()
      .describe(
        'Greenhouse user ID used for the On-Behalf-Of header. Required for write operations (create, update, delete) for audit purposes.'
      )
  })
);
