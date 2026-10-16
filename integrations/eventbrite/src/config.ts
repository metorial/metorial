import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'Optional default organization ID. Call get_user with includeOrganizations=true to discover IDs; each organization-scoped tool can also accept organizationId.'
      )
  })
);
