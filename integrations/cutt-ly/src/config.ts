import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiType: z
      .enum(['regular', 'team'])
      .default('regular')
      .describe(
        'Whether to use the Regular API or the Team API. Team API requires a Team subscription plan.'
      )
  })
);
