import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    site: z
      .string()
      .default('stackoverflow')
      .describe(
        'The Stack Exchange site to query (e.g., stackoverflow, serverfault, superuser, askubuntu)'
      )
  })
);
