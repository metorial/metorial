import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountId: {
      schema: z
        .string()
        .describe(
          'Your Drip account ID. Found in your Drip account settings under General Info.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
