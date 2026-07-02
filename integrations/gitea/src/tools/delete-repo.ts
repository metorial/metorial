import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export let deleteRepo = SlateTool.create(spec, {
  name: 'Delete Repository',
  key: 'delete_repo',
  description: `Permanently delete a repository. This action is irreversible and removes all associated data including issues, pull requests, releases, and wiki pages.`,
  constraints: [
    'This action is irreversible. All repository data will be permanently deleted.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner username or organization name'),
      repo: z.string().describe('Repository name')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the repository was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    await client.deleteRepo(ctx.input.owner, ctx.input.repo);

    return {
      output: { deleted: true },
      message: `Deleted repository **${ctx.input.owner}/${ctx.input.repo}**`
    };
  })
  .build();
