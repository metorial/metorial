import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationSlug: z
      .string()
      .describe(
        'The slug of your Turso organization. This is used to scope API requests to the correct organization.'
      )
  })
);
