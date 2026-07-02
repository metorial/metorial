import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export let listCommits = SlateTool.create(spec, {
  name: 'List Commits',
  key: 'list_commits',
  description: `List commits in a repository. Can filter by branch/tag/SHA and by file path. Returns commit history with author information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      sha: z
        .string()
        .optional()
        .describe('Branch name, tag, or commit SHA to list commits from'),
      path: z
        .string()
        .optional()
        .describe('File path to filter commits that affect this file'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      commits: z.array(
        z.object({
          sha: z.string().describe('Commit SHA'),
          message: z.string().describe('Commit message'),
          authorName: z.string().describe('Commit author name'),
          authorEmail: z.string().describe('Commit author email'),
          authorDate: z.string().describe('Author date'),
          committerName: z.string().describe('Committer name'),
          committerDate: z.string().describe('Committer date'),
          htmlUrl: z.string().describe('Web URL of the commit'),
          authorLogin: z.string().optional().describe('Author Gitea username if linked')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let commits = await client.listCommits(ctx.input.owner, ctx.input.repo, {
      sha: ctx.input.sha,
      path: ctx.input.path,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    return {
      output: {
        commits: commits.map(c => ({
          sha: c.sha,
          message: c.commit.message,
          authorName: c.commit.author.name,
          authorEmail: c.commit.author.email,
          authorDate: c.commit.author.date,
          committerName: c.commit.committer.name,
          committerDate: c.commit.committer.date,
          htmlUrl: c.html_url,
          authorLogin: c.author?.login
        }))
      },
      message: `Found **${commits.length}** commits in **${ctx.input.owner}/${ctx.input.repo}**${ctx.input.sha ? ` on ${ctx.input.sha}` : ''}`
    };
  })
  .build();
