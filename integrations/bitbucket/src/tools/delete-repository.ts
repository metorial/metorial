import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteRepositoryTool = SlateTool.create(spec, {
  name: 'Delete Repository',
  key: 'delete_repository',
  description: `Permanently delete a repository from the workspace. This action is **irreversible** and removes all repository data including branches, commits, pull requests, and issues.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    await client.deleteRepository(ctx.input.repoSlug);

    return {
      output: { deleted: true },
      message: `Deleted repository **${ctx.config.workspace}/${ctx.input.repoSlug}**.`
    };
  })
  .build();
