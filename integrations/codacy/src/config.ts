import { SlateConfig } from 'slates';
import { z } from 'zod';

export let config = SlateConfig.create(
  z
    .object({
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
    .passthrough()
);
