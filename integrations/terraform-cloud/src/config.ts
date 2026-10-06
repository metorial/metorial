import { SlateConfig } from 'slates';
import { z } from 'zod';
export let config = SlateConfig.create(
  z
    .object({
      organizationName: z
        .string()
        .optional()
        .describe(
          'Optional default organization name. Call list_organizations to discover accessible names; organization-scoped tools can override this default. The API region is selected with authentication.'
        )
    })
    .passthrough()
);
