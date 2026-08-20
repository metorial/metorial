import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .default('shm.to')
        .describe('Default domain for short links (e.g. shm.to or your custom domain)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
