import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://analytics.babelstreet.com/rest/v1')
      .describe(
        'Base URL for the Rosette API. Change this if using an on-premise installation.'
      )
  })
);
