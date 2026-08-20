import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    site: {
      schema: z
        .string()
        .default('stackoverflow')
        .describe(
          'The Stack Exchange site to query (e.g., stackoverflow, serverfault, superuser, askubuntu)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
