import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    instance: z
      .enum(['us', 'eu'])
      .default('us')
      .describe('OpsGenie instance region (US or EU)')
  })
);
