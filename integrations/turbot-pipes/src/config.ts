import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://pipes.turbot.com/api/v0')
        .describe(
          'Base URL for the Turbot Pipes API. Change this for enterprise tenants with custom domains.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
