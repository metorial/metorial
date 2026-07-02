import { SlateTool } from 'slates';
import { z } from 'zod';
import { JiraClient } from '../lib/client';
import { spec } from '../spec';

export let addCommentTool = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a comment to a Jira issue or service desk request. Supports both public (customer-visible) and internal (agent-only) comments for service desk requests.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      issueIdOrKey: z.string().describe('Issue key (e.g., PROJ-123) or numeric issue ID'),
      body: z.string().describe('Comment text in plain text'),
      isInternal: z
        .boolean()
        .optional()
        .describe(
          'If true, the comment is internal/agent-only and not visible to customers. Defaults to false (public).'
        )
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('Unique ID of the created comment'),
      authorAccountId: z.string().optional().describe('Account ID of the comment author'),
      authorName: z.string().optional().describe('Display name of the comment author'),
      created: z.string().optional().describe('Comment creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new JiraClient({
      token: ctx.auth.token,
      cloudId: ctx.auth.cloudId
    });

    let result = await client.addComment(
      ctx.input.issueIdOrKey,
      ctx.input.body,
      ctx.input.isInternal
    );

    return {
      output: {
        commentId: result.id,
        authorAccountId: result.author?.accountId,
        authorName: result.author?.displayName,
        created: result.created
      },
      message: `Added ${ctx.input.isInternal ? 'internal' : 'public'} comment to **${ctx.input.issueIdOrKey}**.`
    };
  })
  .build();
