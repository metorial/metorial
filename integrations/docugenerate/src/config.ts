import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu', 'au', 'uk'])
      .default('us')
      .describe(
        'API processing region: "us" (United States), "eu" (European Union), "uk" (United Kingdom), or "au" (Australia).'
      )
  })
);
