import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    orgId: z
      .string()
      .optional()
      .describe('Organization ID to scope operations to a specific organization'),
    projectId: z
      .string()
      .optional()
      .describe('Project ID to scope operations to a specific project')
  })
);
