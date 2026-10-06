import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z
    .object({
      clusterEndpoint: z
        .string()
        .describe(
          'The Qdrant cluster endpoint URL (e.g., https://xyz-example.qdrant.io:6333). Required for database operations.'
        )
        .optional()
    })
    // Preserve the account setting on existing connections without exposing it during setup.
    .passthrough()
);
