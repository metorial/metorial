import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://app.formbricks.com')
        .describe(
          'Base URL of the Formbricks instance. Use the default for cloud-hosted, or provide your self-hosted domain.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
