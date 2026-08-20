import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.clearout.io')
        .describe(
          'Clearout API base URL. May vary based on account type — check the Developer tab in the Clearout App.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
