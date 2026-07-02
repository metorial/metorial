import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    storeUrl: z
      .string()
      .describe('Base URL of the Magento store (e.g. https://mystore.example.com)'),
    storeCode: z
      .string()
      .default('default')
      .describe('Store code for multi-store setups (default: "default")')
  })
);
