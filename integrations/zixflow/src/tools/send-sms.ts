import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { operationOutput, requireInput } from '../lib/response';
import { spec } from '../spec';

export let sendSms = SlateTool.create(spec, {
  name: 'Send SMS',
  key: 'send_sms',
  description: `Send an SMS message to a phone number. Supports transactional, promotional, and OTP routes. Configurable sender ID, flash SMS, and DLT template/entity IDs for India compliance.`,
  constraints: ['DLT template ID and entity ID are required for sending SMS in India.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      reportUrl: z.string().optional().describe('URL to receive provider delivery reports'),
      senderId: z.string().describe('Registered and approved sender name'),
      route: z.enum(['transactional', 'promotional', 'otp']).describe('SMS route type'),
      number: z
        .string()
        .describe('Recipient phone number with country prefix (e.g., "919090909090")'),
      message: z.string().describe('SMS message content'),
      isFlash: z
        .boolean()
        .optional()
        .describe('Send as flash SMS (displays immediately on screen)'),
      dltTemplateId: z.string().optional().describe('DLT template ID (required for India)'),
      dltEntityId: z.string().optional().describe('DLT entity ID (required for India)')
    })
  )
  .output(
    z.object({
      raw: z.unknown().optional().describe('Complete response returned by Zixflow'),
      messageId: z.string().optional().describe('Message ID when returned by Zixflow'),
      campaignId: z.string().optional().describe('Campaign ID when returned by Zixflow'),
      success: z.boolean().describe('Whether Zixflow acknowledged successful SMS submission'),
      responseMessage: z.string().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });

    requireInput(ctx.input.senderId, 'senderId');
    requireInput(ctx.input.number, 'number');
    requireInput(ctx.input.message, 'message');
    let result = await client.sendSms({
      reportUrl: ctx.input.reportUrl,
      senderId: ctx.input.senderId,
      route: ctx.input.route,
      number: ctx.input.number,
      message: ctx.input.message,
      isFlash: ctx.input.isFlash,
      dltTemplateId: ctx.input.dltTemplateId,
      dltEntityId: ctx.input.dltEntityId
    });

    return {
      output: {
        ...operationOutput(result),
        messageId: typeof result.messageId === 'string' ? result.messageId : undefined,
        campaignId: typeof result.campaignId === 'string' ? result.campaignId : undefined
      },
      message:
        'Zixflow accepted the message request; use a delivery report to check recipient delivery.'
    };
  })
  .build();
