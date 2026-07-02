import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

export let verifySecurityCodeTool = SlateTool.create(spec, {
  name: 'Verify Security Code',
  key: 'verify_security_code',
  description: `Verify a security code that was previously sent via SMS Verify or Phone Verify. Codes are valid for 15 minutes and must be verified using the same API credentials that generated them. Includes brute-force protection.`,
  constraints: [
    'Codes expire after 15 minutes',
    'Approximately 10 failed attempts trigger blocking when limitBy is set',
    'Rate limited to 2 requests per second'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      securityCode: z.string().describe('The security code to verify'),
      limitBy: z
        .string()
        .optional()
        .describe('Unique identifier for brute-force protection (e.g., user ID or session ID)')
    })
  )
  .output(
    z.object({
      verified: z.boolean().describe('Whether the security code is valid')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NeutrinoClient({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.verifySecurityCode({
      securityCode: ctx.input.securityCode,
      limitBy: ctx.input.limitBy
    });

    return {
      output: {
        verified: result.verified ?? false
      },
      message: result.verified
        ? `✅ Security code verified successfully.`
        : `❌ Security code is invalid or expired.`
    };
  })
  .build();
