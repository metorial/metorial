import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPullRequestCommentsTool = SlateTool.create(spec, {
  name: 'List Pull Request Comments',
  key: 'list_pull_request_comments',
  description: `Retrieve comments on a pull request, including threaded replies and inline code comment metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      pullRequestId: z.coerce.number().describe('Pull request ID'),
      page: z.number().optional().describe('Page number'),
      pageLen: z.number().optional().describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      comments: z.array(
        z.object({
          commentId: z.number(),
          parentCommentId: z.number().optional(),
          content: z.string().optional(),
          author: z.string().optional(),
          authorUuid: z.string().optional(),
          filePath: z.string().optional(),
          fromLine: z.number().optional(),
          toLine: z.number().optional(),
          createdOn: z.string().optional(),
          updatedOn: z.string().optional(),
          htmlUrl: z.string().optional()
        })
      ),
      totalCount: z.number().optional(),
      hasNextPage: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let result = await client.listPullRequestComments(
      ctx.input.repoSlug,
      ctx.input.pullRequestId,
      {
        page: ctx.input.page,
        pageLen: ctx.input.pageLen
      }
    );

    let comments = (result.values || []).map((comment: any) => ({
      commentId: comment.id,
      parentCommentId: comment.parent?.id || undefined,
      content: comment.content?.raw || undefined,
      author: comment.user?.display_name || undefined,
      authorUuid: comment.user?.uuid || undefined,
      filePath: comment.inline?.path || undefined,
      fromLine: comment.inline?.from || undefined,
      toLine: comment.inline?.to || undefined,
      createdOn: comment.created_on || undefined,
      updatedOn: comment.updated_on || undefined,
      htmlUrl: comment.links?.html?.href || undefined
    }));

    return {
      output: {
        comments,
        totalCount: result.size,
        hasNextPage: !!result.next
      },
      message: `Found **${comments.length}** comments on PR **#${ctx.input.pullRequestId}**.`
    };
  })
  .build();
