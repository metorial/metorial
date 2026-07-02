import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    namespace: z
      .string()
      .optional()
      .describe(
        'Default Docker Hub namespace (username or organization). Used as the default for repository operations when not explicitly specified.'
      )
  })
);
