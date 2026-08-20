import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.fillout.com')
        .describe(
          'Base URL for the Fillout API. Change this if using a self-hosted or EU instance (e.g. https://eu-api.fillout.com).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
