import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let getMessagingLogs = SlateTool.create(spec, {
  name: 'Get Messaging Logs',
  key: 'get_messaging_logs',
  description: `Retrieve messaging logs for SMS, Email, WhatsApp, Voice, or RCS channels. Filter by date range, recipient, status, and more. Useful for tracking delivery status and debugging message issues.`,
  instructions: [
    'SMS logs are available for up to 3 days.',
    'Date format: "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss".'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      channel: z
        .enum(['sms', 'email', 'whatsapp', 'voice', 'rcs'])
        .describe('Messaging channel to fetch logs for'),
      startDate: z.string().optional().describe('Start date for log range'),
      endDate: z.string().optional().describe('End date for log range'),
      recipient: z.string().optional().describe('Filter by recipient phone number or email'),
      requestId: z.string().optional().describe('Filter by specific request ID'),
      status: z.string().optional().describe('Filter by delivery status'),
      templateId: z.string().optional().describe('Filter by template ID (SMS only)'),
      senderId: z.string().optional().describe('Filter by sender ID (SMS only)'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      logs: z.any().describe('Array of messaging log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.channel === 'sms') {
      result = await client.getSmsLogs({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        number: ctx.input.recipient,
        requestId: ctx.input.requestId,
        status: ctx.input.status,
        templateId: ctx.input.templateId,
        senderId: ctx.input.senderId,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
    } else if (ctx.input.channel === 'email') {
      result = await client.getEmailLogs({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        email: ctx.input.recipient,
        requestId: ctx.input.requestId,
        status: ctx.input.status,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
    } else if (ctx.input.channel === 'whatsapp') {
      result = await client.getWhatsAppLogs({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        number: ctx.input.recipient,
        status: ctx.input.status,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
    } else if (ctx.input.channel === 'voice') {
      result = await client.getVoiceLogs({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
    } else {
      result = await client.getRcsLogs({
        startDate: ctx.input.startDate,
        endDate: ctx.input.endDate,
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
    }

    return {
      output: { logs: result },
      message: `Retrieved **${ctx.input.channel.toUpperCase()}** messaging logs.`
    };
  })
  .build();
