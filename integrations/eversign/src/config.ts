import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    businessId: {
      schema: z
        .string()
        .describe(
          'The Business ID to use for API requests. Found in the Developer section of your Eversign account.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    sandbox: {
      schema: z
        .boolean()
        .default(false)
        .describe(
          'Enable sandbox mode for non-production testing. Documents created in sandbox mode are not legally binding.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
