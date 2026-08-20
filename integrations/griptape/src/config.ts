import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://cloud.griptape.ai')
        .describe('Base URL for the Griptape Cloud API'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
