import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    repoName: z
      .string()
      .trim()
      .min(1)
      .describe(
        'Repository name configured in your Entelligence chat widget (e.g., "my-repo")'
      ),
    organization: z
      .string()
      .trim()
      .min(1)
      .describe(
        'Organization name configured in your Entelligence chat widget (e.g., "my-org")'
      )
  })
);
