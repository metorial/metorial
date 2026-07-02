import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let signOn = SlateTool.create(spec, {
  name: 'Single Sign-On',
  key: 'sign_on',
  description: `Signs on a user or form visitor without requiring them to enter credentials, enabling SSO integration from external systems. Returns a redirect URL with a session token that grants access to Formdesk.`
})
  .input(
    z.object({
      username: z.string().optional().describe('Username of the user or visitor to sign on'),
      password: z.string().optional().describe('Password of the user or visitor'),
      visitorId: z.string().optional().describe('Visitor ID to sign on directly'),
      redirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect to after successful sign-on')
    })
  )
  .output(
    z.object({
      redirectUrl: z
        .string()
        .describe('The URL with session token to redirect the user for SSO access')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Generating SSO session...');
    let result = await client.signOn({
      username: ctx.input.username,
      password: ctx.input.password,
      visitorId: ctx.input.visitorId,
      redirectUrl: ctx.input.redirectUrl
    });

    let url = result?.url || result?.redirect_url || result?.redirectUrl || '';

    return {
      output: {
        redirectUrl: String(url)
      },
      message: `SSO session created. Redirect URL generated.`
    };
  })
  .build();
