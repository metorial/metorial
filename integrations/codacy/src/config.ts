import { configV2 } from 'slates';
import { z } from 'zod';

export let config = configV2({
  fields: {
    baseUrl: {
      schema: z
        .string()
        .default('https://app.codacy.com/api/v3')
        .describe(
          'Codacy API base URL. Use the default for Codacy Cloud, or provide your self-hosted instance URL (e.g. https://codacy.example.com/api/v3).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    provider: {
      schema: z
        .enum(['gh', 'ghe', 'gl', 'gle', 'bb', 'bbe'])
        .default('gh')
        .describe(
          'Git provider identifier: gh (GitHub Cloud), ghe (GitHub Enterprise), gl (GitLab Cloud), gle (GitLab Enterprise), bb (Bitbucket Cloud), bbe (Bitbucket Server).'
        ),
      visibility: 'plain',
      lifecycle: 'none'
    },
    organization: {
      schema: z
        .string()
        .describe('Organization name on the Git provider (e.g. your GitHub org name).'),
      visibility: 'plain',
      lifecycle: 'none'
    }
  }
});
