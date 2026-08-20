import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    teamId: {
      schema: z
        .string()
        .optional()
        .describe('Northflank team ID. Required for team-scoped API operations.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
