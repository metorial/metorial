import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://api.travis-ci.com')
      .describe(
        'Travis CI API base URL. Use https://api.travis-ci.com for travis-ci.com or your custom enterprise endpoint.'
      )
  })
);
