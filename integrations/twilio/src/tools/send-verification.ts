import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { spec } from '../spec';

export let sendVerification = SlateTool.create(spec, {
  name: 'Send Verification',
  key: 'send_verification',
  description: `Send a verification code (OTP) to a user via SMS, WhatsApp, voice call, or email using Twilio Verify. Requires a pre-configured Verify Service. Use the **Check Verification** tool to validate the code entered by the user.`,
  instructions: [
    'You must create a Verify Service in the Twilio Console before using this tool.',
    'The "to" field should be an E.164 phone number for SMS/voice/WhatsApp, or an email address for email channel.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      verifyServiceSid: z
        .string()
        .describe('SID of the Twilio Verify Service (starts with VA).'),
      to: z
        .string()
        .describe(
          'Recipient phone number (E.164) or email address to send the verification code to.'
        ),
      channel: z
        .enum(['sms', 'call', 'email', 'whatsapp'])
        .describe('Delivery channel for the verification code.'),
      locale: z
        .string()
        .optional()
        .describe('Locale for the verification message (e.g. "en", "es", "fr").'),
      templateSid: z
        .string()
        .optional()
        .describe('SID of a custom verification template (starts with HJ).')
    })
  )
  .output(
    z.object({
      verificationSid: z.string().describe('Unique SID of the verification attempt'),
      status: z.string().describe('Verification status (typically "pending")'),
      to: z.string().describe('Recipient that the code was sent to'),
      channel: z.string().describe('Channel used for delivery'),
      valid: z.boolean().describe('Whether the verification is currently valid'),
      dateCreated: z.string().nullable().describe('Date the verification was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let result = await client.createVerification(ctx.input.verifyServiceSid, {
      to: ctx.input.to,
      channel: ctx.input.channel,
      locale: ctx.input.locale,
      templateSid: ctx.input.templateSid
    });

    return {
      output: {
        verificationSid: result.sid,
        status: result.status,
        to: result.to,
        channel: result.channel,
        valid: result.valid,
        dateCreated: result.date_created
      },
      message: `Verification code sent to **${ctx.input.to}** via **${ctx.input.channel}** (status: **${result.status}**).`
    };
  })
  .build();
