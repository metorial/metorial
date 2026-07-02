import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    adAccountId: z
      .string()
      .describe(
        'Meta Ad Account ID (e.g., act_123456789). This is used as the default ad account for all operations.'
      ),
    apiVersion: z.string().default('v21.0').describe('Graph API version to use (e.g., v21.0)')
  })
);
