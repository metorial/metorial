import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    secretToken: {
      schema: z
        .string()
        .optional()
        .describe(
          'Zoom webhook Secret Token from the app Event Subscriptions settings; required for endpoint URL validation'
        ),
      visibility: 'secret',
      lifecycle: 'reregister'
    }
  }
});
