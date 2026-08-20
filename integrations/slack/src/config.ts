import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    signingSecret: {
      schema: z
        .string()
        .min(1)
        .describe(
          'Signing Secret for a customer-owned Slack app (Basic Information → App Credentials); required for request verification'
        ),
      visibility: 'secret',
      lifecycle: 'reregister'
    }
  }
});
