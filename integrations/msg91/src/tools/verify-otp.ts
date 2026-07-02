import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let verifyOtp = SlateTool.create(spec, {
  name: 'Verify OTP',
  key: 'verify_otp',
  description: `Verify a one-time password (OTP) entered by a user against the OTP that was previously sent to their mobile number.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      mobile: z.string().describe('Mobile number with country code (e.g., 919XXXXXXXXX)'),
      otp: z.string().describe('The OTP code entered by the user')
    })
  )
  .output(
    z.object({
      type: z.string().describe('Response status type (e.g., "success" or "error")'),
      message: z.string().describe('Verification result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.verifyOtp({
      mobile: ctx.input.mobile,
      otp: ctx.input.otp
    });

    let verified = result.type === 'success';

    return {
      output: {
        type: result.type || 'error',
        message: result.message || ''
      },
      message: verified
        ? `OTP verification **successful** for \`${ctx.input.mobile}\`.`
        : `OTP verification **failed** for \`${ctx.input.mobile}\`: ${result.message}`
    };
  })
  .build();
