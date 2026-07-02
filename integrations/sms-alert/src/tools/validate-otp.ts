import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmsAlertClient } from '../lib/client';
import { spec } from '../spec';

export let validateOtp = SlateTool.create(spec, {
  name: 'Validate OTP',
  key: 'validate_otp',
  description: `Verify an OTP that was previously sent to a mobile number. Returns whether the OTP is valid or has expired/been used.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      mobileNumber: z.string().describe('Mobile number that the OTP was sent to.'),
      otp: z.string().describe('The OTP code entered by the user to validate.')
    })
  )
  .output(
    z.object({
      status: z
        .string()
        .describe('Status of the verification (e.g., "success" or "failure").'),
      description: z.any().describe('Detailed verification response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient({ token: ctx.auth.token });

    ctx.info(`Validating OTP for ${ctx.input.mobileNumber}`);
    let result = await client.validateOtp({
      mobileNo: ctx.input.mobileNumber,
      otp: ctx.input.otp
    });

    let verified = result.status === 'success';

    return {
      output: {
        status: result.status || 'unknown',
        description: result.description || result
      },
      message: verified
        ? `OTP for **${ctx.input.mobileNumber}** verified successfully.`
        : `OTP validation failed for **${ctx.input.mobileNumber}**: ${result.description || 'invalid or expired'}`
    };
  })
  .build();
