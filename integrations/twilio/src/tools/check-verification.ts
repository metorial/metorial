import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { TwilioClient } from '../lib/client';
import { twilioServiceError } from '../lib/errors';
import { spec } from '../spec';

export let checkVerification = SlateTool.create(spec, {
  name: 'Check Verification',
  key: 'check_verification',
  description: `Verify a code entered by the user against a pending Twilio Verify verification. Returns whether the code is valid and the verification status. Pair with **Send Verification** to implement full OTP flows.`,
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
      code: z
        .string()
        .describe('The verification code entered by the user (4-10 characters).'),
      to: z
        .string()
        .optional()
        .describe(
          'Phone number or email the code was sent to. Provide either this or verificationSid.'
        ),
      verificationSid: z
        .string()
        .optional()
        .describe(
          'SID of the specific verification attempt (starts with VE). Provide either this or "to".'
        )
    })
  )
  .output(
    z.object({
      verificationSid: z.string().describe('SID of the verification'),
      status: z.string().describe('Verification status (approved, pending, canceled, etc.)'),
      to: z.string().describe('Recipient of the verification'),
      channel: z.string().describe('Channel used for the verification'),
      valid: z.boolean().describe('Whether the code was correct'),
      dateCreated: z.string().nullable().describe('Date the verification was created')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.to && !ctx.input.verificationSid) {
      throw twilioServiceError(
        'Provide either to or verificationSid to check a verification.'
      );
    }

    if (ctx.input.to && ctx.input.verificationSid) {
      throw twilioServiceError('Provide only one of to or verificationSid.');
    }

    let client = new TwilioClient({
      accountSid: ctx.config.accountSid,
      token: ctx.auth.token,
      apiKeySid: ctx.auth.apiKeySid
    });

    let result = await client.checkVerification(ctx.input.verifyServiceSid, {
      code: ctx.input.code,
      to: ctx.input.to,
      verificationSid: ctx.input.verificationSid
    });

    let isApproved = result.status === 'approved' && result.valid;

    return {
      output: {
        verificationSid: result.sid,
        status: result.status,
        to: result.to,
        channel: result.channel,
        valid: result.valid,
        dateCreated: result.date_created
      },
      message: isApproved
        ? `Verification **approved** ✓ — code for **${result.to}** is valid.`
        : `Verification **${result.status}** — code for **${result.to}** is ${result.valid ? 'valid' : 'invalid'}.`
    };
  })
  .build();
