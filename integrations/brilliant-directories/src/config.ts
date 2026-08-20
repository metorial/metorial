import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    websiteDomain: {
      schema: z
        .string()
        .describe(
          'The base URL of your Brilliant Directories website (e.g., https://mywebsite.com). All API requests will be made relative to this domain.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
