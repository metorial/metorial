import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'Optional saved organization ID for existing connections. Call list_organizations to discover IDs and pass organizationId on each tool.'
      )
  })
);
