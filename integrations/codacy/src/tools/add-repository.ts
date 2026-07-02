import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let addRepository = SlateTool.create(spec, {
  name: 'Add Repository',
  key: 'add_repository',
  description: `Add a repository to Codacy for code analysis. Requires admin permissions on the repository in the Git provider. Specify the provider and the full repository path (e.g. "organization/repo-name").`,
  constraints: [
    'Requires admin permissions on the repository in the Git provider.',
    'Returns a conflict error if the repository is already added.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      repositoryFullPath: z
        .string()
        .describe('Full path of the repository on the Git provider (e.g. "my-org/my-repo").'),
      provider: z
        .enum(['gh', 'ghe', 'gl', 'gle', 'bb', 'bbe'])
        .optional()
        .describe('Git provider identifier. Defaults to the configured provider.')
    })
  )
  .output(
    z.object({
      repositoryName: z.string().describe('Name of the added repository.'),
      provider: z.string().describe('Git provider of the repository.'),
      added: z.boolean().describe('Whether the repository was successfully added.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let provider = ctx.input.provider ?? ctx.config.provider;

    await client.addRepository(provider, ctx.input.repositoryFullPath);

    let repoName =
      ctx.input.repositoryFullPath.split('/').pop() ?? ctx.input.repositoryFullPath;

    return {
      output: {
        repositoryName: repoName,
        provider,
        added: true
      },
      message: `Repository **${ctx.input.repositoryFullPath}** has been added to Codacy for analysis.`
    };
  })
  .build();
