import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z
    .object({
      organization: z
        .string()
        .optional()
        .describe(
          'Optional default organization login. Call get_current_user to discover authorized organizations; individual tools can choose another organization.'
        )
    })
    .passthrough()
);
