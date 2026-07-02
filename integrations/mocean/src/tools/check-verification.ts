import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoceanClient } from '../lib/client';
import { spec } from '../spec';

export let checkVerification = SlateTool.create(spec, {
  name: 'Check Verification Code',
  key: 'check_verification',
  description: `Verify a user-submitted code against the verification code that was sent. Use the request ID from the Send Verification Code response along with the code the user entered.`,
  constraints: ['Maximum 3 incorrect attempts before the request is invalidated (status 15)'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      requestId: z
        .string()
        .describe('Verification request ID from the Send Verification Code response'),
      code: z.string().describe('The PIN code entered by the user')
    })
  )
  .output(
    z.object({
      requestId: z.string().optional().describe('The verification request ID'),
      status: z
        .number()
        .describe(
          'Status code: 0=Match, 15=Too many attempts, 16=Code mismatch, 17=Request not found'
        ),
      verified: z.boolean().describe('Whether the code matched successfully'),
      errorMessage: z.string().optional().describe('Error description if verification failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoceanClient({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    let result = await client.checkVerification({
      requestId: ctx.input.requestId,
      code: ctx.input.code
    });

    let verified = result.status === 0;

    return {
      output: {
        requestId: result.reqid,
        status: result.status,
        verified,
        errorMessage: result.err_msg
      },
      message: verified
        ? `Verification **successful** for request **${ctx.input.requestId}**.`
        : `Verification **failed** for request **${ctx.input.requestId}**: ${result.err_msg || 'Code does not match'}`
    };
  })
  .build();
