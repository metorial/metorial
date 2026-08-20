import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    sandbox: {
      schema: z
        .boolean()
        .default(false)
        .describe('Enable sandbox mode to use fictitious data without consuming credits'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
