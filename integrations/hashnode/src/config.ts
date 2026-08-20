import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    publicationHost: {
      schema: z
        .string()
        .describe(
          'The host of your Hashnode publication, e.g. "yourblog.hashnode.dev" or your custom domain'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
