import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyEmail = SlateTool.create(spec, {
  name: 'Verify Email',
  key: 'verify_email',
  description: `Verify whether an email address is valid and deliverable. Submits an asynchronous verification request and returns the search ID. Icypeas can verify Google and Microsoft catch-all domains. Use **Get Search Result** to retrieve the verification outcome.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address to verify')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the verification was accepted'),
      searchId: z.string().optional().describe('ID to retrieve the result later')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.emailVerification({
      email: ctx.input.email
    });

    return {
      output: {
        success: result.success ?? true,
        searchId: result._id || result.id
      },
      message:
        result.success !== false
          ? `Email verification submitted for **${ctx.input.email}**. Search ID: \`${result._id || result.id}\``
          : `Email verification failed: ${JSON.stringify(result)}`
    };
  })
  .build();
