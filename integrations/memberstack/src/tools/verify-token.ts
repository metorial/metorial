import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { tokenVerificationSchema } from '../lib/types';
import { spec } from '../spec';

export let verifyToken = SlateTool.create(spec, {
  name: 'Verify Member Token',
  key: 'verify_member_token',
  description: `Verify a member's JWT authentication token server-side. Confirms the token's validity and returns the associated member ID, token expiration, and other claims. Useful for protecting sensitive resources and verifying member identity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      memberToken: z.string().describe('The JWT token issued to a member to verify')
    })
  )
  .output(tokenVerificationSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.verifyToken(ctx.input.memberToken);

    return {
      output: result,
      message: `Token verified for member **${result.memberId}**`
    };
  })
  .build();
