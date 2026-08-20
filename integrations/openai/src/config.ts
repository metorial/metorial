import { configV2 } from '@slates/provider';
import { z } from 'zod';

export let config = configV2({
  fields: {
    organizationId: {
      schema: z
        .string()
        .optional()
        .describe('OpenAI Organization ID. Required if you belong to multiple organizations.'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    projectId: {
      schema: z
        .string()
        .optional()
        .describe('OpenAI Project ID. Used to route usage to a specific project.'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
