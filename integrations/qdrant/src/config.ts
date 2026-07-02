import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    clusterEndpoint: z
      .string()
      .describe(
        'The Qdrant cluster endpoint URL (e.g., https://xyz-example.qdrant.io:6333). Required for database operations.'
      )
      .optional(),
    accountId: z
      .string()
      .describe('Qdrant Cloud account ID. Required for cloud management operations.')
      .optional()
  })
);
