import { SlateTool } from 'slates';
import { z } from 'zod';
import { apiTypeFor, createClient, extractCommentSummary } from '../lib/helpers';
import { spec } from '../spec';

let commentOutputSchema = z.object({
  commentId: z.string().describe('Unique identifier of the comment'),
  postId: z.string().describe('ID of the associated post'),
  authorName: z.string().describe('Comment author display name'),
  authorEmail: z.string().describe('Comment author email'),
  content: z.string().describe('Comment content (HTML)'),
  status: z
    .string()
    .describe(
      'Comment status (approved, spam, trash, or held for moderation: "unapproved" on WordPress.com, "hold" on self-hosted sites)'
    ),
  date: z.string().describe('Comment date'),
  parentCommentId: z.string().describe('ID of the parent comment (0 if top-level)'),
  type: z.string().describe('Comment type')
});

export let listCommentsTool = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `Retrieve comments from the site. Can filter by post ID, status, and search term. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      postId: z.string().optional().describe('Filter comments by post ID'),
      status: z
        .string()
        .optional()
        .describe(
          'Filter by status: approved (default), hold (awaiting moderation), spam, trash, or all'
        ),
      perPage: z.number().optional().describe('Number of comments per page (default: 20)'),
      page: z.number().optional().describe('Page number for pagination'),
      search: z
        .string()
        .optional()
        .describe('Search term to filter comments (self-hosted sites only)')
    })
  )
  .output(
    z.object({
      comments: z.array(commentOutputSchema),
      count: z.number().describe('Number of comments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let comments = await client.listComments(ctx.input);
    let results = comments.map((c: any) => extractCommentSummary(c, apiTypeFor(ctx.auth)));
    return {
      output: {
        comments: results,
        count: results.length
      },
      message: `Found **${results.length}** comment(s)${ctx.input.postId ? ` on post ${ctx.input.postId}` : ''}.`
    };
  })
  .build();

export let getCommentTool = SlateTool.create(spec, {
  name: 'Get Comment',
  key: 'get_comment',
  description: `Retrieve a single comment by its ID, including its post, author, content, status, and parent comment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      commentId: z.string().describe('ID of the comment to retrieve')
    })
  )
  .output(commentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let comment = await client.getComment(ctx.input.commentId);
    let result = extractCommentSummary(comment, apiTypeFor(ctx.auth));
    return {
      output: result,
      message: `Retrieved comment **${result.commentId}** on post ${result.postId} (\`${result.status}\`).`
    };
  })
  .build();

export let createCommentTool = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a new comment to a post. Can create top-level comments or replies to existing comments by specifying a parent comment ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      postId: z.string().describe('ID of the post to comment on'),
      content: z.string().describe('Comment content (HTML)'),
      parentCommentId: z.string().optional().describe('ID of the parent comment to reply to'),
      authorName: z
        .string()
        .optional()
        .describe('Comment author name (for self-hosted sites without authentication)'),
      authorEmail: z
        .string()
        .optional()
        .describe('Comment author email (for self-hosted sites without authentication)')
    })
  )
  .output(commentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let comment = await client.createComment(ctx.input);
    let result = extractCommentSummary(comment, apiTypeFor(ctx.auth));
    return {
      output: result,
      message: `Created comment on post **${result.postId}**${ctx.input.parentCommentId ? ` (reply to comment ${ctx.input.parentCommentId})` : ''}.`
    };
  })
  .build();

export let moderateCommentTool = SlateTool.create(spec, {
  name: 'Moderate Comment',
  key: 'moderate_comment',
  description: `Moderate a comment by updating its status (approve, hold for moderation, spam, or trash) or editing its content.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      commentId: z.string().describe('ID of the comment to moderate'),
      status: z
        .enum(['approved', 'hold', 'spam', 'trash'])
        .optional()
        .describe('New comment status'),
      content: z.string().optional().describe('Updated comment content')
    })
  )
  .output(commentOutputSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let comment = await client.updateComment(ctx.input.commentId, {
      status: ctx.input.status,
      content: ctx.input.content
    });
    let result = extractCommentSummary(comment, apiTypeFor(ctx.auth));
    return {
      output: result,
      message: `Moderated comment **${result.commentId}**${ctx.input.status ? ` → status: \`${ctx.input.status}\`` : ''}.`
    };
  })
  .build();

export let deleteCommentTool = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Permanently delete a comment by its ID. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      commentId: z.string().describe('ID of the comment to delete')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the deleted comment'),
      deleted: z.boolean().describe('Whether the comment was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    await client.deleteComment(ctx.input.commentId);
    return {
      output: {
        commentId: ctx.input.commentId,
        deleted: true
      },
      message: `Deleted comment **${ctx.input.commentId}**.`
    };
  })
  .build();
