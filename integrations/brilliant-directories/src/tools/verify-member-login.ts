import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let verifyMemberLogin = SlateTool.create(spec, {
  name: 'Verify Member Login',
  key: 'verify_member_login',
  description: `Verify a member's login credentials. Useful for SSO integrations or custom authentication flows.
Returns whether the credentials are valid.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      email: z.string().describe('The email address of the member.'),
      password: z.string().describe('The password to verify.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      loginResult: z.any().describe('The verification result.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let result = await client.verifyUserLogin({
      email: ctx.input.email,
      password: ctx.input.password
    });

    return {
      output: {
        status: result.status,
        loginResult: result.message
      },
      message: `Login verification completed with status: **${result.status}**.`
    };
  })
  .build();
