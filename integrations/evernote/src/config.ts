import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    sandbox: {
      schema: z
        .boolean()
        .default(false)
        .describe('Use the Evernote sandbox environment instead of production'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
