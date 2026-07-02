import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let starRepository = SlateTool.create(spec, {
  name: 'Star Repository',
  key: 'star_repository',
  description: `Star or unstar a GitHub repository for the authenticated user.`
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      action: z.enum(['star', 'unstar']).describe('Whether to star or unstar the repository')
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      fullName: z.string().describe('Repository full name'),
      htmlUrl: z.string().describe('Repository URL'),
      starred: z.boolean().describe('Whether the repository is starred after this action')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { owner, repo, action } = ctx.input;

    if (action === 'star') {
      await client.starRepository(owner, repo);
      return {
        output: {
          owner,
          repo,
          fullName: `${owner}/${repo}`,
          htmlUrl: client.getRepositoryHtmlUrl(owner, repo),
          starred: true
        },
        message: `Starred **${owner}/${repo}**.`
      };
    }

    await client.unstarRepository(owner, repo);
    return {
      output: {
        owner,
        repo,
        fullName: `${owner}/${repo}`,
        htmlUrl: client.getRepositoryHtmlUrl(owner, repo),
        starred: false
      },
      message: `Removed star from **${owner}/${repo}**.`
    };
  })
  .build();
