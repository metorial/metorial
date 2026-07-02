import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
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
      success: z.boolean().describe('Whether the SMS was sent successfully'),
      responseMessage: z.string().describe('Response message from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZixflowClient({ token: ctx.auth.token });

    let result = await client.sendSms({
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
        success: result.status === true,
        responseMessage: result.message ?? 'Unknown response'
      },
      message: result.status
        ? `SMS sent to ${ctx.input.number} via ${ctx.input.route} route.`
        : `Failed to send SMS: ${result.message}`
    };
  })
  .build();
