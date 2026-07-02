import { SlateConfig } from '@slates/provider';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    organizationId: z
      .string()
      .optional()
      .describe('OpenAI Organization ID. Required if you belong to multiple organizations.'),
    projectId: z
      .string()
      .optional()
      .describe('OpenAI Project ID. Used to route usage to a specific project.')
  })
);
