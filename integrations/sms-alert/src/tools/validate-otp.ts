import { isApiErrorRecord, SlateTool } from 'slates';
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
      verified: z
        .boolean()
        .optional()
        .describe(
          'Whether the provider explicitly confirmed the OTP matched. Omitted for an unrecognized verification response.'
        ),
      description: z.any().describe('Detailed verification response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmsAlertClient(ctx.auth);

    ctx.info(`Validating OTP for ${ctx.input.mobileNumber}`);
    let result = await client.validateOtp({
      mobileNo: ctx.input.mobileNumber,
      otp: ctx.input.otp
    });

    let detail =
      typeof result.description === 'string'
        ? result.description
        : isApiErrorRecord(result.description) && typeof result.description.desc === 'string'
          ? result.description.desc
          : undefined;
    let verified =
      detail && /^code matched successfully\.?$/i.test(detail.trim())
        ? true
        : detail && /^code does not match\.?$/i.test(detail.trim())
          ? false
          : undefined;

    return {
      output: {
        status: result.status || 'unknown',
        verified,
        description: result.description ?? result
      },
      message:
        verified === true
          ? `OTP for **${ctx.input.mobileNumber}** verified successfully.`
          : verified === false
            ? `OTP for **${ctx.input.mobileNumber}** did not match.`
            : `OTP verification response received for **${ctx.input.mobileNumber}**. Review the response details.`
    };
  })
  .build();
