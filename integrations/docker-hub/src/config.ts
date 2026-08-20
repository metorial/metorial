import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    namespace: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default Docker Hub namespace (username or organization). Used as the default for repository operations when not explicitly specified.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
