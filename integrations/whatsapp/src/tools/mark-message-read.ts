import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let markMessageRead = SlateTool.create(spec, {
  name: 'Mark Message as Read',
  key: 'mark_message_read',
  description: `Mark an incoming WhatsApp message as read. This sends a read receipt (blue checkmarks) to the sender and also opens the 24-hour customer service messaging window.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the message to mark as read (wamid.xxx format)')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      phoneNumberId: ctx.config.phoneNumberId,
      wabaId: ctx.config.wabaId,
      apiVersion: ctx.config.apiVersion
    });

    let result = await client.markMessageAsRead(ctx.input.messageId);

    return {
      output: {
        success: result.success === true
      },
      message: `Marked message \`${ctx.input.messageId}\` as read.`
    };
  })
  .build();
