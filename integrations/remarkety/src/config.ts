import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    storeDomain: {
      schema: z.string().optional().describe('Your store domain (e.g., mystore.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    platform: {
      schema: z
        .string()
        .optional()
        .describe(
          'Your eCommerce platform identifier (e.g., SHOPIFY, MAGENTO, WOOCOMMERCE, BIGCOMMERCE, custom)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
