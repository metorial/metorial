import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { operationOutput, requireInput } from '../lib/response';
import { spec } from '../spec';

export let sendOtp = SlateTool.create(spec, {
  name: 'Send OTP',
  key: 'send_otp',
  description: `Send a one-time password (OTP) using Zixflow's OTPflow with intelligent multi-channel fallback. Define an ordered list of delivery channels (SMS, WhatsApp, RCS, Email) — if delivery via the first channel fails or times out, the system automatically falls back to the next channel.`,
  instructions: [
    'Each message in the list represents a channel attempt with a timeout. Channels are tried in order.',
    'A timeout of 0 can trigger channel attempts immediately; use positive delays for ordered fallback. The total timeout must not exceed 300 seconds.',
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
        .describe('URL to receive OTPflow channel-switch notifications'),
      callbackData: z.string().optional().describe('Custom metadata included in callbacks')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete response returned by Zixflow'),
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

    if (ctx.input.messages.length < 1 || ctx.input.messages.length > 5)
      throw createApiServiceError('OTPflow requires 1 to 5 message attempts.', {
        reason: 'zixflow_invalid_input'
      });
    let totalTimeout = 0;
    for (let message of ctx.input.messages) {
      if (!Number.isFinite(message.timeout) || message.timeout < 0 || message.timeout > 300)
        throw createApiServiceError('Each timeout must be between 0 and 300 seconds.', {
          reason: 'zixflow_invalid_input'
        });
      totalTimeout += message.timeout;
      if (message.channel === 'whatsapp' || message.channel === 'rcs')
        requireInput(message.messageType, 'messageType');
    }
    if (totalTimeout > 300)
      throw createApiServiceError(
        'The combined OTPflow timeout must not exceed 300 seconds.',
        { reason: 'zixflow_invalid_input' }
      );
    let result = await client.sendOtp({
      messages: ctx.input.messages.map(m => ({
        channel: m.channel,
        timeout: m.timeout,
        messageType: m.messageType ?? '',
        data: m.channelData
      })),
      webhookUrl: ctx.input.webhookUrl,
      callbackData: ctx.input.callbackData
    });

    return {
      output: {
        ...operationOutput(result),
        eventId: typeof result.eventId === 'string' ? result.eventId : undefined,
        requestIds:
          Array.isArray(result.requestIds) &&
          result.requestIds.every((id: unknown) => typeof id === 'string')
            ? result.requestIds
            : undefined
      },
      message:
        'Zixflow accepted the OTPflow request. Delivery status arrives through the configured channel reports.'
    };
  })
  .build();
