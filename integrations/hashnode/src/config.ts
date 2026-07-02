import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    publicationHost: z
      .string()
      .describe(
        'The host of your Hashnode publication, e.g. "yourblog.hashnode.dev" or your custom domain'
      )
  })
);
