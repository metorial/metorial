import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'Optional default organization ID for resource requests. Use list_organizations to discover IDs; tools can override this default.'
      )
  })
);
