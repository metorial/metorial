import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a custom email or SMS message to supporters in a campaign. Target your entire database or a custom segment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      campaignUuid: z.string().describe('UUID of the campaign'),
      subject: z.string().optional().describe('Email subject line'),
      body: z.string().describe('Message body content (HTML supported for email)'),
      type: z.enum(['email', 'sms']).optional().describe('Message type (default: email)'),
      recipientQuery: z
        .record(z.string(), z.any())
        .optional()
        .describe('Query to filter recipients (e.g. tags, profile membership)')
    })
  )
  .output(
    z.object({
      message: z.record(z.string(), z.any()).describe('The created message object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    let data: Record<string, any> = {
      body: ctx.input.body
    };
    if (ctx.input.subject) data.subject = ctx.input.subject;
    if (ctx.input.type) data.type = ctx.input.type;
    if (ctx.input.recipientQuery) data.recipientQuery = ctx.input.recipientQuery;

    let result = await client.createMessage(ctx.input.campaignUuid, data);
    let messageRecord = result.data || result;

    return {
      output: { message: messageRecord },
      message: `Sent ${ctx.input.type || 'email'} message to campaign supporters.`
    };
  })
  .build();
