import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    appId: {
      schema: z
        .string()
        .describe(
          'Your OneSignal App ID (UUID v4). This is a public identifier used for all API requests.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
