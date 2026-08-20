import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    domain: {
      schema: z
        .string()
        .optional()
        .describe(
          'Your Softr application domain (e.g., yourapp.softr.app). Required for user management operations via the Studio API.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
