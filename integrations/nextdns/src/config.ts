import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    profileId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default NextDNS profile ID to use for triggers and as a fallback for tools'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
