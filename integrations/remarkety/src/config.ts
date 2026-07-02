import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    storeDomain: z.string().optional().describe('Your store domain (e.g., mystore.com)'),
    platform: z
      .string()
      .optional()
      .describe(
        'Your eCommerce platform identifier (e.g., SHOPIFY, MAGENTO, WOOCOMMERCE, BIGCOMMERCE, custom)'
      )
  })
);
