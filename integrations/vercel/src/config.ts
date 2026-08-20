import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    teamId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Vercel Team ID. When provided, all API requests will be scoped to this team.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
