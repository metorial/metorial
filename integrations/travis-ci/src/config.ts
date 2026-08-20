import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://api.travis-ci.com')
        .describe(
          'Travis CI API base URL. Use https://api.travis-ci.com for travis-ci.com or your custom enterprise endpoint.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
