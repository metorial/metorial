import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    storeHash: {
      schema: z
        .string()
        .describe(
          'The unique store hash identifier for your BigCommerce store. Found in your API path: https://api.bigcommerce.com/stores/{store_hash}/'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
