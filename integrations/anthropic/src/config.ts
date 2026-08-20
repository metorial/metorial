import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z.string().default('2023-06-01').describe('Anthropic API version header value'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
