import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { spec } from '../spec';

export let checkVerification = SlateTool.create(spec, {
  name: 'Check Verification Code',
  key: 'check_verification',
  description: `Check a verification code submitted by a user against an active Vonage Verify v2 request. Also supports cancelling an in-progress verification.
Requires the **API Key, Secret & Application JWT** auth method.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      requestId: z
        .string()
        .describe('Verification request ID returned from the Verify User tool'),
      action: z
        .enum(['check', 'cancel'])
        .describe('"check" to validate a code, "cancel" to abort the verification'),
      code: z
        .string()
        .optional()
        .describe('The verification code entered by the user (required for "check" action)')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Verification request ID'),
      status: z.string().describe('Verification status (e.g., "completed", "cancelled")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      applicationId: ctx.auth.applicationId,
      privateKey: ctx.auth.privateKey
    });

    if (ctx.input.action === 'cancel') {
      await client.cancelVerification(ctx.input.requestId);
      return {
        output: { requestId: ctx.input.requestId, status: 'cancelled' },
        message: `Verification \`${ctx.input.requestId}\` has been **cancelled**.`
      };
    }

    if (!ctx.input.code) {
      throw new Error('Code is required for the "check" action');
    }

    let result = await client.checkVerificationCode(ctx.input.requestId, ctx.input.code);

    return {
      output: result,
      message: `Verification \`${ctx.input.requestId}\` code check: **${result.status}**`
    };
  })
  .build();
