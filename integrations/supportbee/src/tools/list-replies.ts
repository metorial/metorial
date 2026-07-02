import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { replySchema } from '../lib/types';
import { spec } from '../spec';

export let listReplies = SlateTool.create(spec, {
  name: 'List Replies',
  key: 'list_replies',
  description: `Retrieve all replies for a support ticket. Returns both agent and customer replies with their content, timestamps, and author information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ticketId: z.number().describe('The ID of the ticket to get replies for')
    })
  )
  .output(
    z.object({
      replies: z.array(replySchema).describe('List of replies on the ticket')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let replies = await client.listReplies(ctx.input.ticketId);

    return {
      output: { replies },
      message: `Found **${replies.length}** replies on ticket **#${ctx.input.ticketId}**`
    };
  })
  .build();
