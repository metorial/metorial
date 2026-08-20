import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    serverUrl: {
      schema: z
        .string()
        .default('https://ntfy.sh')
        .describe(
          'Base URL of the ntfy server. Defaults to the public ntfy.sh server. Set to your self-hosted instance URL if applicable.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    topic: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default topic name for subscriptions and triggers. Used when no specific topic is provided.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
