import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    testMode: {
      schema: z
        .boolean()
        .default(false)
        .describe('Enable test mode to avoid charges during development'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
