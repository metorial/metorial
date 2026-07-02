import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.airbyte.com/v1')
      .describe(
        'Base URL for the Airbyte API. Use https://api.airbyte.com/v1 for Airbyte Cloud, or <YOUR_AIRBYTE_URL>/api/public/v1 for self-managed instances.'
      ),
    workspaceId: z
      .string()
      .optional()
      .describe(
        'Default workspace ID to use for API requests. If not set, must be provided per-request where applicable.'
      )
  })
);
