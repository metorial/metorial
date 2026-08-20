import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'eu', 'au'])
        .default('us')
        .describe('Processing region for document generation (us, eu, or au)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
