import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    adAccountId: z
      .string()
      .describe(
        'Meta Ad Account ID (e.g., act_123456789). This is used as the default ad account for all operations.'
      ),
    businessId: z
      .string()
      .optional()
      .describe(
        'Optional Meta Business ID used by product catalog tools. You can also pass businessId directly to those tools.'
      ),
    apiVersion: z.string().default('v25.0').describe('Graph API version to use (e.g., v25.0)')
  })
);
