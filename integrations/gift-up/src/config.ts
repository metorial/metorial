import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    testMode: {
      schema: z
        .boolean()
        .default(false)
        .describe(
          'Enable test mode to operate against sandbox data without affecting live data'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
