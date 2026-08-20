import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    storeUrl: {
      schema: z
        .string()
        .describe('Base URL of the Magento store (e.g. https://mystore.example.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    storeCode: {
      schema: z
        .string()
        .default('default')
        .describe('Store code for multi-store setups (default: "default")'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
