import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    datacenter: {
      schema: z
        .enum(['auto', 'eu1', 'us1'])
        .default('auto')
        .describe(
          'UniOne datacenter region. Use "auto" for automatic routing, "eu1" for European instance, or "us1" for US instance.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
