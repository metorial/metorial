import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.airbyte.com/v1')
        .describe(
          'Base URL for the Airbyte API. Use https://api.airbyte.com/v1 for Airbyte Cloud, or <YOUR_AIRBYTE_URL>/api/public/v1 for self-managed instances.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    workspaceId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default workspace ID to use for API requests. If not set, must be provided per-request where applicable.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
