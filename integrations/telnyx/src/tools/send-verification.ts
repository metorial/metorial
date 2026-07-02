import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let sendVerification = SlateTool.create(spec, {
  name: 'Send Verification',
  key: 'send_verification',
  description: `Send a two-factor authentication (2FA) verification code to a phone number. Supports SMS, phone call, flash call, and WhatsApp delivery methods. Requires a Verify Profile to be configured.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('Recipient phone number in E.164 format (e.g., +15551234567)'),
      verifyProfileId: z.string().describe('ID of the Verify Profile to use'),
      type: z
        .enum(['sms', 'call', 'flashcall', 'whatsapp'])
        .describe('Verification delivery method'),
      customCode: z
        .string()
        .optional()
        .describe('Custom verification code (if not set, a random code is generated)'),
      timeoutSecs: z.number().optional().describe('Timeout in seconds before the code expires')
    })
  )
  .output(
    z.object({
      verificationId: z.string().describe('Unique ID of the verification request'),
      phoneNumber: z.string().describe('Phone number the code was sent to'),
      type: z.string().describe('Delivery method used'),
      status: z.string().optional().describe('Current verification status'),
      timeoutSecs: z.number().optional().describe('Code expiration timeout in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    let result = await client.sendVerification({
      phoneNumber: ctx.input.phoneNumber,
      verifyProfileId: ctx.input.verifyProfileId,
      type: ctx.input.type,
      customCode: ctx.input.customCode,
      timeoutSecs: ctx.input.timeoutSecs
    });

    return {
      output: {
        verificationId: result.id,
        phoneNumber: result.phone_number ?? ctx.input.phoneNumber,
        type: result.verify_type ?? ctx.input.type,
        status: result.status,
        timeoutSecs: result.timeout_secs
      },
      message: `Verification code sent via **${ctx.input.type}** to **${ctx.input.phoneNumber}**. Status: ${result.status ?? 'sent'}.`
    };
  })
  .build();
