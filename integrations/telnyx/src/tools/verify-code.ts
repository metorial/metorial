import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let verifyCode = SlateTool.create(spec, {
  name: 'Verify Code',
  key: 'verify_code',
  description: `Verify a two-factor authentication code submitted by a user. Checks whether the code matches the one previously sent to the phone number. Returns the verification result.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      phoneNumber: z
        .string()
        .describe('The phone number the code was sent to, in E.164 format'),
      code: z.string().describe('The verification code to check'),
      verifyProfileId: z
        .string()
        .describe('ID of the Verify Profile used for the verification')
    })
  )
  .output(
    z.object({
      phoneNumber: z.string().describe('Phone number verified'),
      status: z
        .string()
        .optional()
        .describe('Verification result status (e.g., "accepted", "rejected")'),
      verifyProfileId: z.string().optional().describe('Verify Profile ID used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    let result = await client.verifyCode(
      ctx.input.phoneNumber,
      ctx.input.code,
      ctx.input.verifyProfileId
    );

    let status =
      result?.response_code === 'accepted'
        ? 'accepted'
        : (result?.response_code ?? result?.status ?? 'unknown');

    return {
      output: {
        phoneNumber: result.phone_number ?? ctx.input.phoneNumber,
        status,
        verifyProfileId: ctx.input.verifyProfileId
      },
      message: `Verification for **${ctx.input.phoneNumber}**: **${status}**.`
    };
  })
  .build();
