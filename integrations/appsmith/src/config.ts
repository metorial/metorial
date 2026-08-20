import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    instanceUrl: {
      schema: z
        .string()
        .describe(
          'The base URL of the Appsmith instance (e.g. https://app.appsmith.com or https://your-self-hosted-domain.com). Do not include a trailing slash.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
