import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    environmentId: {
      schema: z
        .string()
        .describe(
          'The Environment ID (formerly Project ID) from Kontent.ai project settings. Identifies the specific environment within a project.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
