import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://platform.ringcentral.com')
        .describe('RingCentral API base URL'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
