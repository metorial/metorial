import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickSendClient } from '../lib/client';
import { spec } from '../spec';

export let getSmsHistoryTool = SlateTool.create(spec, {
  name: 'Get SMS History',
  key: 'get_sms_history',
  description: `Retrieve the history of sent SMS messages. Supports filtering by date range and pagination. Use this to review past SMS activity, check delivery statuses, or audit messaging records.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      limit: z.number().optional().describe('Number of records per page (max 100)'),
      dateFrom: z
        .number()
        .optional()
        .describe('Unix timestamp to filter messages sent after this time'),
      dateTo: z
        .number()
        .optional()
        .describe('Unix timestamp to filter messages sent before this time')
    })
  )
  .output(
    z.object({
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      totalCount: z.number().describe('Total number of messages in the result set'),
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique identifier of the message'),
            to: z.string().describe('Recipient phone number'),
            from: z.string().describe('Sender ID or number'),
            body: z.string().describe('Message body'),
            status: z.string().describe('Delivery status'),
            direction: z.string().describe('Message direction (outgoing/incoming)'),
            date: z.number().describe('Unix timestamp when the message was sent'),
            messagePrice: z.string().describe('Cost of the message')
          })
        )
        .describe('List of SMS messages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickSendClient({
      username: ctx.auth.username,
      token: ctx.auth.token
    });

    let result = await client.getSmsHistory({
      page: ctx.input.page,
      limit: ctx.input.limit,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo
    });

    let messages = (result.data?.data || []).map((msg: any) => ({
      messageId: msg.message_id || '',
      to: msg.to || '',
      from: msg.from || '',
      body: msg.body || '',
      status: msg.status || '',
      direction: msg.direction || '',
      date: msg.date || 0,
      messagePrice: msg.message_price || '0'
    }));

    let totalCount = result.data?.total || 0;
    let currentPage = result.data?.current_page || 1;
    let totalPages = result.data?.last_page || 1;

    return {
      output: {
        currentPage,
        totalPages,
        totalCount,
        messages
      },
      message: `Retrieved **${messages.length}** SMS messages (page ${currentPage} of ${totalPages}, ${totalCount} total).`
    };
  })
  .build();
