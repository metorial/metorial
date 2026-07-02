import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let commentOutputSchema = z.object({
  commentId: z.number().describe('Comment ID'),
  commentableType: z
    .string()
    .optional()
    .describe('Type of entity this comment is on (e.g., Project, Contact)'),
  commentableId: z.number().optional().describe('ID of the entity this comment is on'),
  text: z.string().optional().describe('Comment text'),
  manual: z.boolean().optional().describe('Whether this is a manually created comment'),
  user: z.any().optional().describe('User who created the comment'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapComment = (c: any) => ({
  commentId: c.id,
  commentableType: c.commentable_type,
  commentableId: c.commentable_id,
  text: c.text,
  manual: c.manual,
  user: c.user,
  createdAt: c.created_at,
  updatedAt: c.updated_at
});

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `Retrieve comments/notes on entities. Filter by entity type (Project, Contact, Company, Deal, Invoice, Offer, Purchase) and entity ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      commentableType: z
        .enum(['Company', 'Contact', 'Deal', 'Invoice', 'Offer', 'Project', 'Purchase'])
        .optional()
        .describe('Filter by entity type'),
      commentableId: z.number().optional().describe('Filter by entity ID'),
      userId: z.number().optional().describe('Filter by comment author user ID'),
      manual: z.boolean().optional().describe('Filter by manual comments only')
    })
  )
  .output(
    z.object({
      comments: z.array(commentOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.commentableType) params.commentable_type = ctx.input.commentableType;
    if (ctx.input.commentableId) params.commentable_id = ctx.input.commentableId;
    if (ctx.input.userId) params.user_id = ctx.input.userId;
    if (ctx.input.manual !== undefined) params.manual = ctx.input.manual;

    let data = await client.listComments(params);
    let comments = (data as any[]).map(mapComment);

    return {
      output: { comments },
      message: `Found **${comments.length}** comments.`
    };
  })
  .build();

export let createComment = SlateTool.create(spec, {
  name: 'Create Comment',
  key: 'create_comment',
  description: `Add a comment/note to an entity (Project, Contact, Company, Deal, Invoice, Offer, or Purchase).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      commentableType: z
        .enum(['Company', 'Contact', 'Deal', 'Invoice', 'Offer', 'Project', 'Purchase'])
        .describe('Entity type to comment on'),
      commentableId: z.number().describe('Entity ID to comment on'),
      text: z.string().describe('Comment text (supports HTML)')
    })
  )
  .output(commentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let c = await client.createComment({
      commentable_type: ctx.input.commentableType,
      commentable_id: ctx.input.commentableId,
      text: ctx.input.text
    });

    return {
      output: mapComment(c),
      message: `Created comment on **${ctx.input.commentableType}** (ID: ${ctx.input.commentableId}).`
    };
  })
  .build();

export let deleteComment = SlateTool.create(spec, {
  name: 'Delete Comment',
  key: 'delete_comment',
  description: `Delete a manual comment. Only manually created comments can be deleted.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      commentId: z.number().describe('The ID of the comment to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deleteComment(ctx.input.commentId);

    return {
      output: { success: true },
      message: `Deleted comment **${ctx.input.commentId}**.`
    };
  })
  .build();
