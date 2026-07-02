import { SlateTool } from 'slates';
import { z } from 'zod';
import { Msg91Client } from '../lib/client';
import { spec } from '../spec';

export let resendOtp = SlateTool.create(spec, {
  name: 'Resend OTP',
  key: 'resend_otp',
  description: `Resend a one-time password (OTP) to a mobile number. Supports resending via SMS text or voice call when previous attempts fail.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mobile: z.string().describe('Mobile number with country code (e.g., 919XXXXXXXXX)'),
      retryType: z
        .enum(['text', 'voice'])
        .optional()
        .describe('Resend method: "text" for SMS, "voice" for voice call')
    })
  )
  .output(
    z.object({
      type: z.string().describe('Response status type'),
      message: z.string().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Msg91Client({ token: ctx.auth.token });

    let result = await client.resendOtp({
      mobile: ctx.input.mobile,
      retryType: ctx.input.retryType
    });

    return {
      output: {
        type: result.type || 'success',
        message: result.message || ''
      },
      message: `OTP resent to **${ctx.input.mobile}** via ${ctx.input.retryType || 'text'}.`
    };
  })
  .build();
