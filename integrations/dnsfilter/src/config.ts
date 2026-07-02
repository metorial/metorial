import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        "Default organization ID to scope API requests to. If not set, requests use the token owner's organization."
      )
  })
);
