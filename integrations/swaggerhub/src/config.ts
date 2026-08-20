import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.swaggerhub.com')
        .describe(
          'Base URL for the SwaggerHub Registry API. Change this for on-premise installations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    owner: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default owner (username or organization) to use for API operations when not explicitly specified.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
