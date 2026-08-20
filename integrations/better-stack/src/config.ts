import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    teamName: {
      schema: z
        .string()
        .optional()
        .describe(
          'Team name to use when creating resources with a global API token. Required when using a global token.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
