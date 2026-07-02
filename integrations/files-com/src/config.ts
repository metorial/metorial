import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    subdomain: z
      .string()
      .optional()
      .describe(
        'Your Files.com subdomain (e.g. "mycompany" for mycompany.files.com). Leave empty to use the default "app.files.com" base URL.'
      )
  })
);
