import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    storeUrl: z
      .string()
      .describe('The base URL of your WooCommerce store (e.g., https://mystore.example.com)')
  })
);
