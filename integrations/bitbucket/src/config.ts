import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    workspace: z
      .string()
      .describe(
        'Bitbucket workspace slug. All API operations will be scoped to this workspace.'
      )
  })
);
