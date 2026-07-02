import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    teamId: z
      .string()
      .optional()
      .describe('Northflank team ID. Required for team-scoped API operations.')
  })
);
