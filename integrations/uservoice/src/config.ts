import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .describe('Your UserVoice subdomain (e.g., "mycompany" for mycompany.uservoice.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
