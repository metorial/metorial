import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    profileKey: {
      schema: z
        .string()
        .optional()
        .describe(
          'Profile Key for operating on behalf of a specific user profile (Business Plan)'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
