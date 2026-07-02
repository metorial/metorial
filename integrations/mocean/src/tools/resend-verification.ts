import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

export let resendVerification = SlateTool.create(spec, {
  name: 'Resend Verification Code',
  key: 'resend_verification',
  description: `Resend a verification code for an existing verification request via SMS. Use the request ID from the original Send Verification Code response.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      requestId: z
        .string()
        .describe('Verification request ID from the original Send Verification Code response'),
      enableNumberLookup: z
        .boolean()
        .optional()
        .describe('Check number validity before resending')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('The verification request ID'),
      status: z.number().describe('Status code (0 = success)'),
      to: z.string().optional().describe('Recipient phone number'),
      resendNumber: z.string().optional().describe('Which resend attempt this is'),
      numberReachable: z.string().optional().describe('Number reachability status'),
      errorMessage: z.string().optional().describe('Error description if failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.resendVerification({
      requestId: ctx.input.requestId,
      requestNl: ctx.input.enableNumberLookup
    });

    return {
      output: {
        requestId: result.reqid,
        status: result.status,
        to: result.to,
        resendNumber: result.resend_number,
        numberReachable: result.is_number_reachable,
        errorMessage: result.err_msg
      },
      message:
        result.status === 0
          ? `Verification code resent (attempt #${result.resend_number || '?'}) to **${result.to}**.`
          : `Failed to resend verification: ${result.err_msg}`
    };
  })
  .build();
