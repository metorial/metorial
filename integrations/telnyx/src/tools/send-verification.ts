import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { invalid, required } from '../lib/native';
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
      action: z
        .enum(['send', 'get'])
        .default('send')
        .describe('Send a verification or read its exact native status'),
      verificationId: z.string().optional().describe('Required for get'),
      phoneNumber: z
        .string()
        .optional()
        .describe('Recipient phone number in E.164 format (e.g., +15551234567)'),
      verifyProfileId: z.string().optional().describe('ID of the Verify Profile to use'),
      type: z
        .enum(['sms', 'call', 'flashcall', 'whatsapp'])
        .optional()
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
      status: z.string().nullish().describe('Current verification status'),
      timeoutSecs: z.number().optional().describe('Code expiration timeout in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    if (ctx.input.action === 'send' && !ctx.input.type) invalid('Select type for send.');
    let result =
      ctx.input.action === 'get'
        ? await client.getVerification(required(ctx.input.verificationId, 'verificationId'))
        : await client.sendVerification({
            phoneNumber: required(ctx.input.phoneNumber, 'phoneNumber'),
            verifyProfileId: required(ctx.input.verifyProfileId, 'verifyProfileId'),
            type: ctx.input.type!,
            customCode: ctx.input.customCode,
            timeoutSecs: ctx.input.timeoutSecs
          });

    return {
      output: {
        verificationId: result.id,
        phoneNumber: result.phone_number,
        type: result.type,
        status: result.status,
        timeoutSecs: result.timeout_secs
      },
      message: `Verification **${result.id}**: ${result.type}, status **${result.status}**. Delivery and acceptance are separate states.`
    };
  })
  .build();
