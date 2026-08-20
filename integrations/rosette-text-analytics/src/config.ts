import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://analytics.babelstreet.com/rest/v1')
        .describe(
          'Base URL for the Rosette API. Change this if using an on-premise installation.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
