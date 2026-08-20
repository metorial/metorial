import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    subdomain: {
      schema: z
        .string()
        .optional()
        .describe(
          'Your Files.com subdomain (e.g. "mycompany" for mycompany.files.com). Leave empty to use the default "app.files.com" base URL.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
