import { SlateConfig } from 'slates';
import { z } from 'zod';

export const config = SlateConfig.create(
  z.object({
    apiVersion: z
      .enum(['v1', 'v2'])
      .optional()
      .describe(
        'API version. Defaults to v1 for existing connections. Select v2 explicitly for current dataset schemas and row readback. Dataset IDs and page numbering differ between versions; never reuse IDs across versions without verification.'
      )
  })
);
