import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    orgId: {
      schema: z
        .string()
        .optional()
        .describe('Organization ID to scope operations to a specific organization'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    projectId: {
      schema: z
        .string()
        .optional()
        .describe('Project ID to scope operations to a specific project'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
