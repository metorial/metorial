import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMessages = SlateTool.create(spec, {
  name: 'Get Messages',
  key: 'get_messages',
  description: `Retrieve message history for a contact. Returns the conversation thread including both incoming and outgoing messages across all channels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      contactId: z.string().describe('Contact ID to retrieve messages for'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of messages per page')
    })
  )
  .output(
    z.object({
      messages: z.array(z.record(z.string(), z.any())).describe('Array of message records'),
      totalCount: z.number().optional().describe('Total number of messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let result = await client.getMessages(ctx.input.contactId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let messages = Array.isArray(result) ? result : result.messages || result.data || [];
    let totalCount = result.totalCount || result.total || messages.length;

    return {
      output: {
        messages,
        totalCount
      },
      message: `Retrieved **${messages.length}** message(s) for contact ${ctx.input.contactId}.`
    };
  })
  .build();
