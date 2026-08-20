import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .describe('Your Project Bubble domain (e.g., mydomain.projectbubble.com)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
