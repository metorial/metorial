import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    storeHash: z
      .string()
      .describe(
        'The unique store hash identifier for your BigCommerce store. Found in your API path: https://api.bigcommerce.com/stores/{store_hash}/'
      )
  })
);
