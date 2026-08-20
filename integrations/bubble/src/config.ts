import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    appBaseUrl: {
      schema: z
        .string()
        .describe(
          'The base URL of your Bubble application API, e.g. "https://appname.bubbleapps.io/api/1.1" or "https://yourdomain.com/api/1.1". Must include the /api/1.1 path.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
