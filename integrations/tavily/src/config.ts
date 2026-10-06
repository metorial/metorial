import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .optional()
      .describe(
        'Optional native project ID to scope the usage query. This header is not applied to searches or content requests.'
      )
  })
);
