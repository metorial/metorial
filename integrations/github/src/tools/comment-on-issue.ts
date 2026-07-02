import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let commentOnIssue = SlateTool.create(spec, {
  name: 'Comment on Issue',
  key: 'comment_on_issue',
  description: `Add a comment to an existing issue or pull request. Both issues and pull requests share the same comment API.`
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue or pull request number'),
      body: z.string().describe('Comment body in Markdown')
    })
  )
  .output(
    z.object({
      commentId: z.number().describe('Unique comment ID'),
      htmlUrl: z.string().describe('URL to the comment on GitHub'),
      author: z.string().describe('Comment author login'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let comment = await client.createIssueComment(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.issueNumber,
      ctx.input.body
    );

    return {
      output: {
        commentId: comment.id,
        htmlUrl: comment.html_url,
        author: comment.user.login,
        createdAt: comment.created_at
      },
      message: `Added comment on **#${ctx.input.issueNumber}** in **${ctx.input.owner}/${ctx.input.repo}** — ${comment.html_url}`
    };
  })
  .build();
