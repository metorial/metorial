import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    datacenter: z
      .enum(['auto', 'eu1', 'us1'])
      .default('auto')
      .describe(
        'UniOne datacenter region. Use "auto" for automatic routing, "eu1" for European instance, or "us1" for US instance.'
      )
  })
);
