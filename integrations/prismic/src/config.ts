import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    repositoryName: z
      .string()
      .describe(
        'The name of your Prismic repository (e.g., "my-repo" from my-repo.prismic.io)'
      )
  })
);
