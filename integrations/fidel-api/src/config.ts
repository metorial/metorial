import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    environment: z
      .enum(['test', 'live'])
      .default('test')
      .describe(
        'Whether to use test or live mode. Determines which API keys and data are used.'
      )
  })
);
