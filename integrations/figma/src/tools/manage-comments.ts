import { SlateTool } from 'slates';
import { z } from 'zod';
import { FigmaClient } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.string().describe('Unique comment identifier'),
  message: z.string().describe('Comment text content'),
  fileKey: z.string().optional().describe('File key the comment belongs to'),
  parentCommentId: z.string().optional().describe('Parent comment ID if this is a reply'),
  createdAt: z.string().describe('When the comment was created'),
  resolvedAt: z.string().nullable().optional().describe('When the comment was resolved'),
  orderId: z.string().optional().describe('Order ID for comment threading'),
  user: z
    .object({
      userId: z.string().describe('User ID of the commenter'),
      handle: z.string().describe('Display name of the commenter'),
      imageUrl: z.string().optional().describe('Avatar URL of the commenter')
    })
    .optional()
    .describe('User who posted the comment')
});

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `Retrieve all comments on a Figma file, including replies and resolution status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).describe('List of comments on the file')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);
    let result = await client.getComments(ctx.input.fileKey);

    let comments = (result.comments || []).map((c: any) => ({
      commentId: c.id,
      message: c.message,
      fileKey: c.file_key,
      parentCommentId: c.parent_id,
      createdAt: c.created_at,
      resolvedAt: c.resolved_at,
      orderId: c.order_id,
      user: c.user
        ? {
            userId: c.user.id,
            handle: c.user.handle,
            imageUrl: c.user.img_url
          }
        : undefined
    }));

    return {
      output: { comments },
      message: `Found **${comments.length}** comment(s) on file`
    };
  })
  .build();

export let postComment = SlateTool.create(spec, {
  name: 'Post Comment',
  key: 'post_comment',
  description: `Add a new comment or reply to an existing comment on a Figma file. Optionally pin the comment to a specific location or node.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file'),
      message: z.string().describe('The comment text to post'),
      replyToCommentId: z
        .string()
        .optional()
        .describe('Comment ID to reply to, if posting a reply'),
      position: z
        .object({
          x: z.number().describe('X coordinate'),
          y: z.number().describe('Y coordinate')
        })
        .optional()
        .describe('Canvas position to pin the comment to'),
      nodeId: z.string().optional().describe('Node ID to attach the comment to'),
      nodeOffset: z
        .object({
          x: z.number().describe('X offset from node'),
          y: z.number().describe('Y offset from node')
        })
        .optional()
        .describe('Offset from the node position')
    })
  )
  .output(commentSchema)
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);

    let clientMeta: any;
    if (ctx.input.nodeId && ctx.input.nodeOffset) {
      clientMeta = {
        node_id: ctx.input.nodeId,
        node_offset: ctx.input.nodeOffset
      };
    } else if (ctx.input.position) {
      clientMeta = ctx.input.position;
    }

    let result = await client.postComment(ctx.input.fileKey, {
      message: ctx.input.message,
      commentId: ctx.input.replyToCommentId,
      clientMeta
    });

    return {
      output: {
        commentId: result.id,
        message: result.message,
        fileKey: result.file_key,
        parentCommentId: result.parent_id,
        createdAt: result.created_at,
        resolvedAt: result.resolved_at,
        orderId: result.order_id,
        user: result.user
          ? {
              userId: result.user.id,
              handle: result.user.handle,
              imageUrl: result.user.img_url
            }
          : undefined
      },
      message: ctx.input.replyToCommentId
        ? `Replied to comment **${ctx.input.replyToCommentId}**`
        : `Posted new comment on file`
    };
  })
  .build();

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a comment from a Figma file. Only the comment author or file owner can delete comments.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      fileKey: z.string().describe('The key of the Figma file'),
      commentId: z.string().describe('The ID of the comment to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the comment was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FigmaClient(ctx.auth.token);
    await client.deleteComment(ctx.input.fileKey, ctx.input.commentId);

    return {
      output: { deleted: true },
      message: `Deleted comment **${ctx.input.commentId}**`
    };
  })
  .build();
