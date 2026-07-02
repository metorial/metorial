import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let sendReply = SlateTool.create(spec, {
  name: 'Send Reply',
  key: 'send_reply',
  description: `Send a reply to a contact's response through Emelia's merged inbox. Allows replying directly within the campaign context.`
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign'),
      contactId: z.string().describe('ID of the contact to reply to'),
      body: z.string().describe('Reply message body (HTML or plain text)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the reply was sent'),
      reply: z.record(z.string(), z.unknown()).optional().describe('Reply details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let result = await client.replyToEmeliaReply({
      campaignId: ctx.input.campaignId,
      contactId: ctx.input.contactId,
      body: ctx.input.body
    });
    return {
      output: { success: true, reply: result },
      message: `Sent reply to contact **${ctx.input.contactId}** in campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
