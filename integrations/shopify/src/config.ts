import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let SHOPIFY_DEFAULT_API_VERSION = '2026-01';

export let config = configV2({
  fields: {
    shopDomain: {
      schema: z
        .string()
        .describe('The shop subdomain (e.g., "my-store" from "my-store.myshopify.com")'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    apiVersion: {
      schema: z
        .string()
        .default(SHOPIFY_DEFAULT_API_VERSION)
        .describe('Shopify API version (e.g., "2026-01")'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
