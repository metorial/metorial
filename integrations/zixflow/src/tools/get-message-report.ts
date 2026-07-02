import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { spec } from '../spec';

export let getMessageReport = SlateTool.create(spec, {
  name: 'Get Message Report',
  key: 'get_message_report',
  description: `Retrieve the delivery report for a sent message. Provides delivery status (SENT, DELIVERED, FAILED, READ), timestamps, and destination details. Works for WhatsApp, SMS, and Email channels.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      channel: z.enum(['whatsapp', 'sms', 'email']).describe('Message channel'),
      messageId: z.string().describe('Message ID received when the message was sent')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the report was retrieved successfully'),
      accountId: z.string().optional().describe('Account ID'),
      messageId: z.string().optional().describe('Message ID'),
      campaignId: z.string().optional().describe('Campaign ID'),
      deliveryStatus: z
        .string()
        .optional()
        .describe('Delivery status (SENT, DELIVERED, FAILED, READ)'),
      statusAt: z.string().optional().describe('Timestamp of the status update'),
      destination: z.string().optional().describe('Recipient phone number or email'),
      remark: z.string().optional().describe('Additional remark or error details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });
    let result = await client.getMessageReport(ctx.input.channel, ctx.input.messageId);
    let report = result.data;

    return {
      output: {
        success: result.status === true,
        accountId: report?.accountId,
        messageId: report?.messageId,
        campaignId: report?.campaignId,
        deliveryStatus: report?.status,
        statusAt: report?.statusAt,
        destination: report?.destination,
        remark: report?.remark
      },
      message: result.status
        ? `${ctx.input.channel} message to ${report?.destination ?? 'unknown'}: **${report?.status ?? 'unknown'}**`
        : `Failed to fetch report: ${result.message}`
    };
  })
  .build();
