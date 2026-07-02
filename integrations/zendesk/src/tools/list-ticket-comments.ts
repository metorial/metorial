import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

let attachmentSchema = z.object({
  attachmentId: z.string(),
  fileName: z.string().nullable(),
  contentType: z.string().nullable(),
  contentUrl: z.string().nullable(),
  size: z.number().nullable()
});

let commentSchema = z.object({
  commentId: z.string(),
  auditId: z.string().nullable(),
  authorId: z.string(),
  body: z.string().nullable(),
  htmlBody: z.string().nullable(),
  plainBody: z.string().nullable(),
  public: z.boolean(),
  type: z.string(),
  viaChannel: z.string().nullable(),
  createdAt: z.string(),
  attachments: z.array(attachmentSchema)
});

let mapAttachment = (attachment: any) => ({
  attachmentId: String(attachment.id),
  fileName: attachment.file_name || null,
  contentType: attachment.content_type || null,
  contentUrl: attachment.content_url || null,
  size: typeof attachment.size === 'number' ? attachment.size : null
});

let mapComment = (comment: any) => ({
  commentId: String(comment.id),
  auditId: comment.audit_id ? String(comment.audit_id) : null,
  authorId: String(comment.author_id),
  body: comment.body || null,
  htmlBody: comment.html_body || null,
  plainBody: comment.plain_body || null,
  public: Boolean(comment.public),
  type: comment.type || 'Comment',
  viaChannel: comment.via?.channel || null,
  createdAt: comment.created_at,
  attachments: (comment.attachments || []).map(mapAttachment)
});

export let listTicketComments = SlateTool.create(spec, {
  name: 'List Ticket Comments',
  key: 'list_ticket_comments',
  description: `Lists comments on a Zendesk support ticket, including public replies, internal notes, authors, HTML/plain bodies, and attachment metadata.`,
  constraints: ['Returns up to 100 comments per page'],
  tags: { readOnly: true }
})
  .input(
    z.object({
      ticketId: z.string().describe('The ticket ID whose comments should be listed'),
      page: z.number().optional().default(1).describe('Page number for offset pagination'),
      perPage: z
        .number()
        .optional()
        .default(25)
        .describe('Number of comments per page (max 100)'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort by creation date'),
      includeUsers: z.boolean().optional().default(false).describe('Sideload comment users'),
      includeInlineImages: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include inline images in attachment metadata')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema),
      count: z.number(),
      nextPage: z.string().nullable(),
      previousPage: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZendeskClient({
      subdomain: ctx.config.subdomain,
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType
    });

    let data = await client.getTicketComments(ctx.input.ticketId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sortOrder: ctx.input.sortOrder,
      includeUsers: ctx.input.includeUsers,
      includeInlineImages: ctx.input.includeInlineImages
    });

    let comments = (data.comments || []).map(mapComment);

    return {
      output: {
        comments,
        count: data.count || comments.length,
        nextPage: data.next_page || null,
        previousPage: data.previous_page || null
      },
      message: `Found ${data.count || comments.length} comment(s) on ticket #${ctx.input.ticketId}, showing ${comments.length}.`
    };
  })
  .build();
