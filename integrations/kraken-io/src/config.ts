import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    sandbox: {
      schema: z
        .boolean()
        .default(false)
        .describe(
          'Enable sandbox/dev mode for testing. Returns randomized results without consuming quota.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
