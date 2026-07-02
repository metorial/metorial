import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let SHOPIFY_DEFAULT_API_VERSION = '2026-01';

export let config = SlateConfig.create(
  z.object({
    shopDomain: z
      .string()
      .describe('The shop subdomain (e.g., "my-store" from "my-store.myshopify.com")'),
    apiVersion: z
      .string()
      .default(SHOPIFY_DEFAULT_API_VERSION)
      .describe('Shopify API version (e.g., "2026-01")')
  })
);
