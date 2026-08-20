import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z
        .string()
        .default('20240304')
        .describe('Wit.ai API version date (format: YYYYMMDD). Defaults to 20240304.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
