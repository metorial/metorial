import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    teamId: z
      .string()
      .optional()
      .describe(
        'Vercel Team ID for Access Token authentication. OAuth uses the team selected during installation.'
      )
  })
);
