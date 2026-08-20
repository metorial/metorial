import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    apiType: {
      schema: z
        .enum(['regular', 'team'])
        .default('regular')
        .describe(
          'Whether to use the Regular API or the Team API. Team API requires a Team subscription plan.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
