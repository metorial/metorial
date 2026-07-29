import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let forkRepository = SlateTool.create(spec, {
  name: 'Fork Repository',
  key: 'fork_repository',
  description:
    'Fork a GitHub repository to the authenticated account or a specified organization. GitHub may complete large forks asynchronously.',
  tags: { destructive: false }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      organization: z.string().optional().describe('Organization to fork to')
    })
  )
  .output(
    z.object({
      repositoryId: z.number().optional().describe('Forked repository ID'),
      fullName: z.string().optional().describe('Forked repository in owner/name format'),
      htmlUrl: z.string().optional().describe('URL of the forked repository'),
      defaultBranch: z.string().optional().describe('Default branch of the fork'),
      private: z.boolean().optional().describe('Whether the fork is private'),
      status: z
        .enum(['created', 'in_progress'])
        .describe('Whether GitHub returned the created fork or is still processing it')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let fork = await client.requestRest<Record<string, any>>({
      method: 'POST',
      path: `/repos/${encodeURIComponent(ctx.input.owner)}/${encodeURIComponent(ctx.input.repo)}/forks`,
      operation: 'fork repository',
      reason: 'github_fork_repository_failed',
      body: {
        organization: ctx.input.organization
      }
    });

    let fullName = typeof fork.full_name === 'string' ? fork.full_name : undefined;
    let htmlUrl = typeof fork.html_url === 'string' ? fork.html_url : undefined;
    let status = fullName && htmlUrl ? ('created' as const) : ('in_progress' as const);
    return {
      output: {
        repositoryId: fork.id,
        fullName,
        htmlUrl,
        defaultBranch: fork.default_branch,
        private: fork.private,
        status
      },
      message:
        status === 'created'
          ? `Forked **${ctx.input.owner}/${ctx.input.repo}** as **${fullName}** — ${htmlUrl}`
          : `GitHub is creating the fork of **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
