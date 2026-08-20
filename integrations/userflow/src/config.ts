import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z
        .string()
        .default('2020-01-03')
        .describe('Userflow API version to use (e.g. 2020-01-03)'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
