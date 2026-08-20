import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    useEuEndpoint: {
      schema: z
        .boolean()
        .default(false)
        .describe(
          'Use the EU endpoint (eu-api.ipdata.co) to ensure end user data stays in the EU'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
