import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'eu'])
      .default('us')
      .describe('API region. "us" uses api.boldsign.com, "eu" uses eu-api.boldsign.com')
  })
);
