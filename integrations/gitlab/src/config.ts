import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    projectId: z
      .string()
      .optional()
      .describe(
        'Default GitLab project ID or URL-encoded path for project-scoped CI/CD tools.'
      )
  })
);
