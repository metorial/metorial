import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .optional()
      .describe('Atlas Project (Group) ID. Required for most project-level operations.'),
    organizationId: z
      .string()
      .optional()
      .describe('Atlas Organization ID. Required for organization-level operations.')
  })
);
