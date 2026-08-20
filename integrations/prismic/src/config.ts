import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    repositoryName: {
      schema: z
        .string()
        .describe(
          'The name of your Prismic repository (e.g., "my-repo" from my-repo.prismic.io)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
