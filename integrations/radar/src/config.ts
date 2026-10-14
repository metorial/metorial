import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['test', 'live'])
      .default('live')
      .describe(
        'Legacy environment preference. Radar uses the test or live environment associated with your API key.'
      )
  })
);
