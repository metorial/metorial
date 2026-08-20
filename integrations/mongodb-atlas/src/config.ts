import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .optional()
        .describe('Atlas Project (Group) ID. Required for most project-level operations.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe('Atlas Organization ID. Required for organization-level operations.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
