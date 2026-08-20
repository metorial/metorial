import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.cal.com')
        .describe(
          'Base URL for the Cal.com API. Change this if using a self-hosted instance.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
