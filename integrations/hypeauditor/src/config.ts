import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiVersion: {
      schema: z
        .enum(['1', '2'])
        .default('2')
        .describe(
          'API version to use. v1 is deprecated since August 2024, v2 is recommended.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
