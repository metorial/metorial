import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    orgId: {
      schema: z
        .string()
        .describe('Your Stack AI organization ID. Found in your account settings or URL.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
