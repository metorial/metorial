import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationDomain: z
      .string()
      .optional()
      .describe(
        'Organization domain for Crowdin Enterprise (e.g. "myorg"). Leave empty for standard Crowdin.'
      )
  })
);
