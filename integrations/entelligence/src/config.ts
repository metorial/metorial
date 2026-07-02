import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    repoName: z.string().describe('Repository name to interact with (e.g., "my-repo")'),
    organization: z
      .string()
      .describe('Organization name that owns the repository (e.g., "my-org")')
  })
);
