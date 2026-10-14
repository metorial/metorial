import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z
    .object({
      accountSlug: z
        .string()
        .optional()
        .describe('Default account slug (personal or organization) to use for operations.')
    })
    .passthrough()
);
