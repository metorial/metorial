import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    apiVersion: z
      .enum(['v5', '2026-03-15'])
      .optional()
      .describe(
        'API version. Defaults to v5 to preserve existing behavior. Select 2026-03-15 for the current API: contact tags replace the full set, cursor formats change, and subscribed identifiers can trigger welcome messages. Version availability and permissions must be verified for your connection.'
      )
  })
);
