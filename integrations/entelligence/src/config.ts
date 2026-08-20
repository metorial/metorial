import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    repoName: {
      schema: z.string().describe('Repository name to interact with (e.g., "my-repo")'),
      visibility: 'plain',
      lifecycle: 'none'
    },
    organization: {
      schema: z
        .string()
        .describe('Organization name that owns the repository (e.g., "my-org")'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
