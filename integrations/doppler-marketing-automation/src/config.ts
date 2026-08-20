import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    accountEmail: {
      schema: z
        .string()
        .describe(
          'The email address associated with your Doppler account. Used in all API request paths.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
