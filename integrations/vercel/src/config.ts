import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    teamId: z
      .string()
      .optional()
      .describe('Vercel Team ID. When provided, all API requests will be scoped to this team.')
  })
);
