import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['default', 'us', 'eu', 'au'])
        .default('default')
        .describe(
          'API region endpoint. "default" uses Singapore, "us" for US East, "eu" for Europe (Frankfurt), "au" for Australia (Sydney).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
