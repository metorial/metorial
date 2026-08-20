import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationSlug: {
      schema: z
        .string()
        .describe(
          'The slug of your Turso organization. This is used to scope API requests to the correct organization.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
