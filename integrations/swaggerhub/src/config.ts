import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.swaggerhub.com')
      .describe(
        'Base URL for the SwaggerHub Registry API. Change this for on-premise installations.'
      ),
    owner: z
      .string()
      .optional()
      .describe(
        'Default owner (username or organization) to use for API operations when not explicitly specified.'
      )
  })
);
