import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    customerId: {
      schema: z
        .string()
        .describe(
          'Your Sprout Social customer ID. Retrieve this via the /v1/metadata/client endpoint or from your Sprout Social account settings.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
