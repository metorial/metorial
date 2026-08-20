import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .optional()
        .describe(
          'MongoDB Atlas Project (Group) ID. Required for most project-scoped operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe(
          'MongoDB Atlas Organization ID. Required for organization-scoped operations.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
