import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    testMode: z
      .boolean()
      .default(false)
      .describe(
        'Use test data on supported gift card, order, and report endpoints. Catalog and account settings are shared with live mode.'
      )
  })
);
