import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    region: {
      schema: z
        .enum(['us', 'canada', 'europe', 'australia'])
        .default('us')
        .describe(
          'The region your Feathery account is hosted in. Determines the API base URL.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
