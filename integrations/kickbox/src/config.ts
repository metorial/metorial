import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    sandbox: {
      schema: z
        .boolean()
        .default(false)
        .describe(
          'Enable sandbox mode to test without using credits. All results will be mock data.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
