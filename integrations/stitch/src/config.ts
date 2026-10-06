import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z
    .object({
      clientId: z
        .string()
        .optional()
        .describe(
          'Legacy fallback account ID from the dashboard URL when no ID can be discovered from the Connect token. Required for Import-only push validation; batch ingestion does not need it.'
        )
    })
    .passthrough()
);
