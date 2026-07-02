import { SlateTool } from 'slates';
import { z } from 'zod';
import { EgnyteClient } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('Unique comment ID (UUID)'),
  message: z.string().describe('Comment text'),
  username: z.string().optional().describe('Username of the comment author'),
  formattedName: z.string().optional().describe('Display name of the author'),
  creationTime: z.string().optional().describe('When the comment was created'),
  filePath: z.string().optional().describe('Path to the file'),
  groupId: z.string().optional().describe('File group ID'),
  canDelete: z
    .boolean()
    .optional()
    .describe('Whether the current user can delete this comment')
});

export let addCommentTool = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a comment (note) to a file in Egnyte. Comments are visible to all users with access to the file.`
})
  .input(
    z.object({
      filePath: z.string().describe('Path to the file to comment on'),
      message: z.string().describe('Comment text')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.createComment(ctx.input.filePath, ctx.input.message)) as Record<
      string,
      unknown
    >;

    return {
      output: {
        commentId: String(result.id || ''),
        message: String(result.message || ctx.input.message),
        username: result.username ? String(result.username) : undefined,
        formattedName: result.formatted_name ? String(result.formatted_name) : undefined,
        creationTime: result.creation_time ? String(result.creation_time) : undefined,
        filePath: result.file_path ? String(result.file_path) : ctx.input.filePath,
        groupId: result.group_id ? String(result.group_id) : undefined,
        canDelete: typeof result.can_delete === 'boolean' ? result.can_delete : undefined
      },
      message: `Added comment to **${ctx.input.filePath}**`
    };
  })
  .build();

export let listCommentsTool = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `List all comments (notes) on a specific file in Egnyte. Returns comments with author information and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filePath: z.string().describe('Path to the file'),
      offset: z.number().optional().describe('Pagination offset'),
      count: z.number().optional().describe('Number of comments per page')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).describe('List of comments'),
      totalResults: z.number().optional().describe('Total number of comments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = (await client.listComments(ctx.input.filePath, {
      offset: ctx.input.offset,
      count: ctx.input.count
    })) as Record<string, unknown>;

    let rawNotes = Array.isArray(result.notes) ? result.notes : [];
    let comments = rawNotes.map((n: Record<string, unknown>) => ({
      commentId: String(n.id || ''),
      message: String(n.message || ''),
      username: n.username ? String(n.username) : undefined,
      formattedName: n.formatted_name ? String(n.formatted_name) : undefined,
      creationTime: n.creation_time ? String(n.creation_time) : undefined,
      filePath: n.file_path ? String(n.file_path) : ctx.input.filePath,
      groupId: n.group_id ? String(n.group_id) : undefined,
      canDelete: typeof n.can_delete === 'boolean' ? n.can_delete : undefined
    }));

    return {
      output: {
        comments,
        totalResults:
          typeof result.total_results === 'number' ? result.total_results : undefined
      },
      message: `Found **${comments.length}** comment(s) on **${ctx.input.filePath}**`
    };
  })
  .build();

export let deleteCommentTool = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment (note) from a file in Egnyte.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      commentId: z.string().describe('UUID of the comment to delete')
    })
  )
  .output(
    z.object({
      commentId: z.string(),
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new EgnyteClient({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    await client.deleteComment(ctx.input.commentId);

    return {
      output: {
        commentId: ctx.input.commentId,
        deleted: true
      },
      message: `Deleted comment **${ctx.input.commentId}**`
    };
  })
  .build();
