import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default Bugsnag organization ID. If provided, tools will use this organization unless overridden.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    projectId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default Bugsnag project ID. If provided, tools will use this project unless overridden.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
