import { configV2 } from 'slates';
import { z } from 'zod';
import { FINAGO_DEFAULT_BASE_URL } from './lib/client';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .optional()
        .describe(
          `Optional Finago REST API base URL override. Defaults to ${FINAGO_DEFAULT_BASE_URL}.`
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
