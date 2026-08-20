import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    clusterEndpoint: {
      schema: z
        .string()
        .describe(
          'The Qdrant cluster endpoint URL (e.g., https://xyz-example.qdrant.io:6333). Required for database operations.'
        )
        .optional(),
      visibility: 'plain',
      lifecycle: 'none'
    },
    accountId: {
      schema: z
        .string()
        .describe('Qdrant Cloud account ID. Required for cloud management operations.')
        .optional(),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
