import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    connectServerUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          'The URL of your self-hosted 1Password Connect server (e.g., http://localhost:8080). Required for item, vault, and file operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    eventsApiRegion: {
      schema: z
        .enum(['us', 'ca', 'eu', 'enterprise'])
        .default('us')
        .describe(
          'The region where your 1Password Business account is hosted. Determines the Events API base URL.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
