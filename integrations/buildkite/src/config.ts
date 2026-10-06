import { SlateConfig } from 'slates';
import { z } from 'zod';
export let config = SlateConfig.create(
  z.object({
    organizationSlug: z
      .string()
      .optional()
      .describe(
        'Optional default organization slug from your Buildkite URL. Tools can choose another organization discovered with list_organizations.'
      )
  })
);
