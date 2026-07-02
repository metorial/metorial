import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    websiteDomain: z
      .string()
      .describe(
        'The base URL of your Brilliant Directories website (e.g., https://mywebsite.com). All API requests will be made relative to this domain.'
      )
  })
);
