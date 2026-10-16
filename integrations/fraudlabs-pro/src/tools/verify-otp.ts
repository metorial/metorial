import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { parseProviderOutput } from '../lib/response';
import { spec } from '../spec';

let outputSchema = z.object({
  isValid: z.boolean().describe('Whether the OTP is valid (true) or not (false)'),
  rawResult: z.string().describe('Raw result from the API: Y for valid, N for invalid')
});

export let verifyOtp = SlateTool.create(spec, {
  name: 'Verify OTP',
  key: 'verify_otp',
  description: `Verifies a one-time password (OTP) entered by a user against the OTP that was sent via the Send SMS Verification tool. Returns whether the OTP is valid or not.`,
  instructions: ['Use the smsTransactionId returned from the Send SMS Verification tool.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      smsTransactionId: z
        .string()
        .describe('Transaction ID from the Send SMS Verification response'),
      otp: z.string().describe('The OTP code entered by the user to verify')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    ctx.info('Verifying OTP...');

    let result = await client.verifyOtp({
      transactionId: ctx.input.smsTransactionId,
      otp: ctx.input.otp
    });

    if (result.result !== 'Y' && result.result !== 'N') {
      throw createApiServiceError(
        'FraudLabs Pro returned an invalid OTP verification response.'
      );
    }
    let isValid = result.result === 'Y';

    let output = parseProviderOutput(
      outputSchema,
      {
        isValid,
        rawResult: result.result
      },
      'OTP verification'
    );

    return {
      output,
      message: isValid
        ? `OTP verification **successful**. The code is valid.`
        : `OTP verification **failed**. The code is invalid or expired.`
    };
  })
  .build();
