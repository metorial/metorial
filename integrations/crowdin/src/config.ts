import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationDomain: {
      schema: z
        .string()
        .optional()
        .describe(
          'Organization domain for Crowdin Enterprise (e.g. "myorg"). Leave empty for standard Crowdin.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
