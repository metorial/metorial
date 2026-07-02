import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.number().describe('Comment ID'),
  body: z.string().describe('Comment body'),
  authorLogin: z.string().describe('Comment author username'),
  htmlUrl: z.string().describe('Web URL of the comment'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listIssueComments = SlateTool.create(spec, {
  name: 'List Issue Comments',
  key: 'list_issue_comments',
  description: `List all comments on an issue or pull request. Comments are returned in chronological order.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue or pull request number'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let comments = await client.listIssueComments(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.issueNumber,
      {
        page: ctx.input.page,
        limit: ctx.input.limit
      }
    );

    return {
      output: {
        comments: comments.map(c => ({
          commentId: c.id,
          body: c.body,
          authorLogin: c.user.login,
          htmlUrl: c.html_url,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }))
      },
      message: `Found **${comments.length}** comments on issue **#${ctx.input.issueNumber}**`
    };
  })
  .build();

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a comment to an issue or pull request. Supports Markdown formatting.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue or pull request number'),
      body: z.string().describe('Comment body (supports Markdown)')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let c = await client.createIssueComment(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.issueNumber,
      ctx.input.body
    );

    return {
      output: {
        commentId: c.id,
        body: c.body,
        authorLogin: c.user.login,
        htmlUrl: c.html_url,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Added comment to issue **#${ctx.input.issueNumber}**`
    };
  })
  .build();

export let updateComment = SlateTool.create(spec, {
  name: 'Update Comment',
  key: 'update_comment',
  description: `Edit an existing comment on an issue or pull request.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      commentId: z.number().describe('Comment ID to update'),
      body: z.string().describe('New comment body (supports Markdown)')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let c = await client.updateIssueComment(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.commentId,
      ctx.input.body
    );

    return {
      output: {
        commentId: c.id,
        body: c.body,
        authorLogin: c.user.login,
        htmlUrl: c.html_url,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      },
      message: `Updated comment **#${c.id}**`
    };
  })
  .build();

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from an issue or pull request.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      commentId: z.number().describe('Comment ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the comment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    await client.deleteIssueComment(ctx.input.owner, ctx.input.repo, ctx.input.commentId);

    return {
      output: { deleted: true },
      message: `Deleted comment **#${ctx.input.commentId}**`
    };
  })
  .build();
