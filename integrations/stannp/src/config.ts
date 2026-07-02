import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['us', 'uk'])
      .default('us')
      .describe('API region. US uses api-us1.stannp.com, UK/EU uses dash.stannp.com')
  })
);
