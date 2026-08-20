import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'au'])
        .default('us')
        .describe('BigML region. "us" uses bigml.io, "au" uses au.bigml.io.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    devMode: {
      schema: z
        .boolean()
        .default(false)
        .describe('Enable development mode for free access with limited data size (~1MB).'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
