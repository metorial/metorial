import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    storeUrl: {
      schema: z
        .string()
        .describe(
          'The base URL of your WooCommerce store (e.g., https://mystore.example.com)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
