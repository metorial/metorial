import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://app.rocketadmin.com')
        .describe(
          'Rocketadmin instance URL. Use the default for cloud-hosted or your self-hosted URL.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
