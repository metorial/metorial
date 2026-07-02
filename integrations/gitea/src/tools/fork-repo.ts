import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export let forkRepo = SlateTool.create(spec, {
  name: 'Fork Repository',
  key: 'fork_repo',
  description: `Fork a repository to the authenticated user's account or to a specified organization.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Owner of the repository to fork'),
      repo: z.string().describe('Name of the repository to fork'),
      organization: z
        .string()
        .optional()
        .describe('Organization to fork to; if omitted, forks to the authenticated user'),
      name: z.string().optional().describe('Custom name for the forked repository')
    })
  )
  .output(
    z.object({
      repositoryId: z.number().describe('Forked repository ID'),
      fullName: z.string().describe('Full name of the forked repository'),
      htmlUrl: z.string().describe('Web URL of the forked repository'),
      cloneUrl: z.string().describe('HTTPS clone URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let r = await client.forkRepo(ctx.input.owner, ctx.input.repo, {
      organization: ctx.input.organization,
      name: ctx.input.name
    });

    return {
      output: {
        repositoryId: r.id,
        fullName: r.full_name,
        htmlUrl: r.html_url,
        cloneUrl: r.clone_url
      },
      message: `Forked **${ctx.input.owner}/${ctx.input.repo}** → **${r.full_name}**`
    };
  })
  .build();
