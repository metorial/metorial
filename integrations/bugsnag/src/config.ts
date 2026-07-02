import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe(
        'Default Bugsnag organization ID. If provided, tools will use this organization unless overridden.'
      ),
    projectId: z
      .string()
      .optional()
      .describe(
        'Default Bugsnag project ID. If provided, tools will use this project unless overridden.'
      )
  })
);
