import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { createClient } from '../lib/helpers';

export let addTicketComment = SlateTool.create(spec, {
  name: 'Desk Add Ticket Comment',
  key: 'desk_add_ticket_comment',
  description: `Add a comment to an existing ticket. Comments can be public (visible to the customer) or private (internal notes visible only to agents).`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      orgId: z
        .string()
        .optional()
        .describe('Organization ID. Call desk_list_organizations to discover IDs.'),
      ticketId: z.string().describe('ID of the ticket to comment on'),
      content: z.string().describe('Comment content (HTML supported)'),
      isPublic: z
        .boolean()
        .optional()
        .describe(
          'Whether the comment is visible to the customer (default: false for private)'
        ),
      contentType: z
        .enum(['html', 'plainText'])
        .optional()
        .describe('Content type of the comment (default: plainText)')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the created comment'),
      content: z.string().optional().describe('Content of the comment'),
      isPublic: z.boolean().optional().describe('Whether the comment is public'),
      commentedTime: z.string().optional().describe('Time the comment was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let commentData: Record<string, any> = {
      content: ctx.input.content
    };
    if (ctx.input.isPublic !== undefined) commentData.isPublic = ctx.input.isPublic;
    if (ctx.input.contentType) commentData.contentType = ctx.input.contentType;

    let result = await client.addTicketComment(ctx.input.ticketId, commentData);

    return {
      output: {
        commentId: result.id,
        content: result.content,
        isPublic: result.isPublic,
        commentedTime: result.commentedTime
      },
      message: `Added ${result.isPublic ? 'public' : 'private'} comment to ticket **${ctx.input.ticketId}**`
    };
  })
  .build();
