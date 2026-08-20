import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    projectId: {
      schema: z
        .string()
        .optional()
        .describe(
          'Default GitLab project ID or URL-encoded path for project-scoped CI/CD tools.'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
