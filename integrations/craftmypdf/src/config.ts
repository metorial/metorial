import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    region: z
      .enum(['default', 'us', 'eu', 'au'])
      .default('default')
      .describe(
        'API region endpoint. "default" uses Singapore, "us" for US East, "eu" for Europe (Frankfurt), "au" for Australia (Sydney).'
      )
  })
);
