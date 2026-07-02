import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExecutionClient } from '../lib/client';
import { spec } from '../spec';

export let checkSsl = SlateTool.create(spec, {
  name: 'Check SSL Certificate',
  key: 'check_ssl',
  description: `Checks the SSL certificate status of a domain and retrieves certificate details including expiration date. Useful for monitoring SSL certificates and detecting upcoming expirations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      domain: z
        .string()
        .describe(
          'Domain name to check, e.g., "example.com". Do not include the protocol (https://).'
        )
    })
  )
  .output(
    z.object({
      certificateDetails: z
        .any()
        .describe(
          'SSL certificate details including expiration dates, issuer info, and validity status.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExecutionClient({ token: ctx.auth.token });

    let certificateDetails = await client.sslCheck({ domain: ctx.input.domain });

    return {
      output: { certificateDetails },
      message: `SSL certificate checked for ${ctx.input.domain}.`
    };
  })
  .build();
