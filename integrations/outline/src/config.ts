import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://app.getoutline.com')
        .describe(
          'Base URL of the Outline instance. Use https://app.getoutline.com for cloud or your self-hosted domain.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
