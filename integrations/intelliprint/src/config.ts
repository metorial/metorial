import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    testmode: {
      schema: z
        .boolean()
        .default(false)
        .describe(
          'When enabled, all print jobs are created in test mode by default. Test jobs are free and never actually sent.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
