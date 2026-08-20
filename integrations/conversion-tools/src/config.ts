import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    sandbox: {
      schema: z
        .boolean()
        .default(false)
        .describe('Enable sandbox mode for testing without consuming API quotas'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
