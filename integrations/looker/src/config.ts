import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instanceUrl: z
      .string()
      .trim()
      .min(1, 'Looker instance URL is required.')
      .describe(
        'HTTPS base URL of your Looker instance, matching the URL used during authentication. Include any explicit port or proxy path prefix, and omit credentials, query parameters, fragments, and the /api/4.0 suffix.'
      )
  })
);
