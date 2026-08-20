import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://plausible.io')
        .describe(
          'Base URL for the Plausible Analytics instance. Defaults to the hosted service. Change this for self-hosted instances.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
