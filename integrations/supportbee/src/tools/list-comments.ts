import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { commentSchema } from '../lib/types';
import { spec } from '../spec';

export let listComments = SlateTool.create(spec, {
  name: 'List Comments',
  key: 'list_comments',
  description: `Retrieve all internal comments on a ticket. Comments are internal notes visible only to agents, useful for reviewing the collaboration history on a ticket.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('The ID of the ticket to get comments for')
    })
  )
  .output(
    z.object({
      comments: z.array(commentSchema).describe('List of internal comments on the ticket')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let comments = await client.listComments(ctx.input.ticketId);

    return {
      output: { comments },
      message: `Found **${comments.length}** comments on ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();
