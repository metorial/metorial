import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { spec } from '../spec';

export let sendOtp = SlateTool.create(spec, {
  name: 'Send OTP',
  key: 'send_otp',
  description: `Send a one-time password (OTP) using Zixflow's OTPflow with intelligent multi-channel fallback. Define an ordered list of delivery channels (SMS, WhatsApp, RCS, Email) — if delivery via the first channel fails or times out, the system automatically falls back to the next channel.`,
  instructions: [
    'Each message in the list represents a channel attempt with a timeout. Channels are tried in order.',
    'Set timeout to 0 for the last channel (no fallback needed).',
    'The messageType field varies: empty for SMS/email, "template" or "custom" for WhatsApp, "text"/"image"/"video" etc. for RCS.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      messages: z
        .array(
          z.object({
            channel: z.enum(['sms', 'whatsapp', 'rcs', 'email']).describe('Delivery channel'),
            timeout: z
              .number()
              .describe(
                'Timeout in seconds before falling back to next channel (0-300, use 0 for last channel)'
              ),
            messageType: z.string().optional().describe('Message type (varies by channel)'),
            channelData: z
              .record(z.string(), z.any())
              .describe('Channel-specific payload data')
          })
        )
        .describe('Ordered list of channel delivery attempts'),
      webhookUrl: z
        .string()
        .optional()
        .describe('URL to receive success/failure webhook notifications'),
      callbackData: z.string().optional().describe('Custom metadata included in callbacks')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the OTP was initiated successfully'),
      responseMessage: z.string().describe('Response message from the API'),
      eventId: z.string().optional().describe('Event ID for tracking the OTP delivery'),
      requestIds: z
        .array(z.string())
        .optional()
        .describe('Request IDs for each channel attempt')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });

    let result = await client.sendOtp({
      messages: ctx.input.messages.map(m => ({
        channel: m.channel,
        timeout: m.timeout,
        messageType: m.messageType,
        data: m.channelData
      })),
      webhookUrl: ctx.input.webhookUrl,
      callbackData: ctx.input.callbackData
    });

    let success = result.status === 'success' || result.status === true;

    return {
      output: {
        success,
        responseMessage: result.message ?? 'Unknown response',
        eventId: result.eventId,
        requestIds: result.requestIds
      },
      message: success
        ? `OTP delivery initiated across ${ctx.input.messages.length} channel(s).`
        : `Failed to send OTP: ${result.message}`
    };
  })
  .build();
