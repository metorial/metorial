import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

type InboundSms = {
  message_id: string;
  original_message_id?: string | null;
  from: string;
  to: string;
  body: string;
  original_body?: string | null;
  timestamp_send?: number | string;
  custom_string?: string | null;
};

export let listInboundSmsTool = SlateTool.create(spec, {
  name: 'List Inbound SMS',
  key: 'list_inbound_sms',
  description:
    'Retrieve unread incoming SMS messages and replies with the original outgoing message IDs and pagination.',
  instructions: [
    'Requires an inbound rule with its action set to POLL in the ClickSend dashboard.',
    'Multiple matching POLL rules can return the same message more than once. Use messageId to identify duplicates.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().int().min(1).optional().describe('Page number, starting at 1'),
      limit: z
        .number()
        .int()
        .min(15)
        .max(100)
        .optional()
        .describe('Messages per page, from 15 to 100')
    })
  )
  .output(
    z.object({
      currentPage: z.number(),
      totalPages: z.number(),
      totalCount: z.number(),
      messages: z.array(
        z.object({
          messageId: z.string(),
          originalMessageId: z.string().optional(),
          from: z.string(),
          to: z.string(),
          body: z.string(),
          originalBody: z.string().optional(),
          sentAt: z.number().optional(),
          customString: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient(ctx.auth);
    let result = await client.getInboundSms(ctx.input);
    let data = result.data;
    let rows: InboundSms[] = data?.data ?? [];
    let messages = rows.map(message => ({
      messageId: message.message_id,
      originalMessageId: message.original_message_id || undefined,
      from: message.from,
      to: message.to,
      body: message.body,
      originalBody: message.original_body || undefined,
      sentAt: message.timestamp_send == null ? undefined : Number(message.timestamp_send),
      customString: message.custom_string || undefined
    }));
    return {
      output: {
        currentPage: data?.current_page ?? 1,
        totalPages: data?.last_page ?? 1,
        totalCount: data?.total ?? messages.length,
        messages
      },
      message: `Retrieved ${messages.length} incoming SMS message(s).`
    };
  })
  .build();
