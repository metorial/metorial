import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let listCommits = SlateTool.create(spec, {
  name: 'List Commits',
  key: 'list_commits',
  description: `List commits on a repository branch with filtering by SHA, path, author, or date range.`,
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
        .describe(
          'Commit SHA, branch, or tag to list from. When omitted, uses the default branch.'
        ),
      path: z.string().optional().describe('Only commits containing this file path'),
      author: z.string().optional().describe('GitHub username or email to filter by'),
      since: z
        .string()
        .optional()
        .describe('Only commits after this ISO 8601 date or timestamp'),
      until: z
        .string()
        .optional()
        .describe('Only commits before this ISO 8601 date or timestamp'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page (minimum 1, maximum 100; default 30)'),
      page: z.number().min(1).optional().describe('Page number (minimum 1)')
    })
  )
  .output(
    z.object({
      commits: z.array(
        z.object({
          sha: z.string().describe('Commit SHA'),
          message: z.string().describe('Commit message'),
          author: z.string().nullable().describe('Author login'),
          authorEmail: z.string().nullable().describe('Author email'),
          committerLogin: z.string().nullable().describe('Committer login'),
          date: z.string().describe('Commit date'),
          htmlUrl: z.string().describe('URL to the commit on GitHub')
        })
      ),
      totalCount: z.number().describe('Number of commits returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let commits = await client.listCommits(ctx.input.owner, ctx.input.repo, {
      sha: ctx.input.sha,
      path: ctx.input.path,
      author: ctx.input.author,
      since: ctx.input.since,
      until: ctx.input.until,
      perPage: ctx.input.perPage,
      page: ctx.input.page
    });

    let mapped = commits.map((c: any) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.author?.login ?? null,
      authorEmail: c.commit.author?.email ?? null,
      committerLogin: c.committer?.login ?? null,
      date: c.commit.author?.date ?? c.commit.committer?.date,
      htmlUrl: c.html_url
    }));

    return {
      output: { commits: mapped, totalCount: mapped.length },
      message: `Found **${mapped.length}** commits in **${ctx.input.owner}/${ctx.input.repo}**${ctx.input.sha ? ` on \`${ctx.input.sha}\`` : ''}.`
    };
  })
  .build();
