import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['sfo', 'lon', 'ams'])
        .default('sfo')
        .describe('Browser region: sfo (San Francisco), lon (London), ams (Amsterdam)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
