import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .optional()
      .describe(
        'MongoDB Atlas Project (Group) ID. Required for most project-scoped operations.'
      ),
    organizationId: z
      .string()
      .optional()
      .describe('MongoDB Atlas Organization ID. Required for organization-scoped operations.')
  })
);
