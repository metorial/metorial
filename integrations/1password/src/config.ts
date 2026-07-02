import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    connectServerUrl: z
      .string()
      .optional()
      .describe(
        'The URL of your self-hosted 1Password Connect server (e.g., http://localhost:8080). Required for item, vault, and file operations.'
      ),
    eventsApiRegion: z
      .enum(['us', 'ca', 'eu', 'enterprise'])
      .default('us')
      .describe(
        'The region where your 1Password Business account is hosted. Determines the Events API base URL.'
      )
  })
);
