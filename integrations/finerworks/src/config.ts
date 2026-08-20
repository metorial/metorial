import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    testMode: {
      schema: z
        .boolean()
        .default(false)
        .describe(
          'Enable test mode. While in test mode, nothing will be processed or billed. All responses will simulate a live environment.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
