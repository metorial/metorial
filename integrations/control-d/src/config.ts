import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    orgId: z
      .string()
      .optional()
      .describe(
        'Optional sub-organization ID to impersonate. Use manage_organization with list_sub_orgs to discover IDs. When set, supported API calls operate within that sub-organization context.'
      )
  })
);
