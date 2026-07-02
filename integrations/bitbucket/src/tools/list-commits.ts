import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCommitsTool = SlateTool.create(spec, {
  name: 'List Commits',
  key: 'list_commits',
  description: `List commits in a repository, optionally filtered by branch. Returns commit hashes, messages, authors, and dates.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      branch: z.string().optional().describe('Branch name to list commits for'),
      page: z.number().optional().describe('Page number'),
      pageLen: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      commits: z.array(
        z.object({
          commitHash: z.string(),
          message: z.string().optional(),
          authorName: z.string().optional(),
          authorEmail: z.string().optional(),
          date: z.string().optional(),
          htmlUrl: z.string().optional()
        })
      ),
      hasNextPage: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let result = await client.listCommits(ctx.input.repoSlug, {
      branch: ctx.input.branch,
      page: ctx.input.page,
      pageLen: ctx.input.pageLen
    });

    let commits = (result.values || []).map((c: any) => ({
      commitHash: c.hash,
      message: c.message || undefined,
      authorName: c.author?.user?.display_name || c.author?.raw || undefined,
      authorEmail: c.author?.raw?.match(/<(.+?)>/)?.[1] || undefined,
      date: c.date || undefined,
      htmlUrl: c.links?.html?.href || undefined
    }));

    return {
      output: {
        commits,
        hasNextPage: !!result.next
      },
      message: `Found **${commits.length}** commits${ctx.input.branch ? ` on branch ${ctx.input.branch}` : ''}.`
    };
  })
  .build();
