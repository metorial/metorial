import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    connectServerUrl: z
      .string()
      .optional()
      .describe(
        'The URL of your self-hosted 1Password Connect server (e.g., http://localhost:8080). Required for item, vault, and file operations.'
      )
  })
);
