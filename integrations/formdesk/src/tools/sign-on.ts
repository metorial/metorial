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
      formName: z
        .string()
        .optional()
        .describe(
          'Form name for visitor sign-on. Call list_forms to discover names; omit for account-user sign-on.'
        ),
      email: z.string().optional().describe('Email of the user or visitor to sign on'),
      userId: z
        .string()
        .optional()
        .describe('Account-user ID for account sign-on; do not combine with visitorId'),
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
      formName: ctx.input.formName,
      email: ctx.input.email,
      userId: ctx.input.userId,
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
