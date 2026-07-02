import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z.object({
    baseUrl: z
      .string()
      .default('https://app.codacy.com/api/v3')
      .describe(
        'Codacy API base URL. Use the default for Codacy Cloud, or provide your self-hosted instance URL (e.g. https://codacy.example.com/api/v3).'
      ),
    provider: z
      .enum(['gh', 'ghe', 'gl', 'gle', 'bb', 'bbe'])
      .default('gh')
      .describe(
        'Git provider identifier: gh (GitHub Cloud), ghe (GitHub Enterprise), gl (GitLab Cloud), gle (GitLab Enterprise), bb (Bitbucket Cloud), bbe (Bitbucket Server).'
      ),
    organization: z
      .string()
      .describe('Organization name on the Git provider (e.g. your GitHub org name).')
  })
);
