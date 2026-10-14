import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let authenticateVisitor = SlateTool.create(spec, {
  name: 'Authenticate Visitor',
  key: 'authenticate_visitor',
  description: `Validates a visitor's credentials (username and password) and returns the authenticated visitor's data if successful. Useful for verifying visitor identity before granting access.`,
  constraints: [
    'This legacy credential-validation endpoint is not described in the current REST collection; availability depends on the account.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      username: z.string().describe('The visitor username to authenticate'),
      password: z.string().describe('The visitor password to verify')
    })
  )
  .output(
    z.object({
      authenticated: z.boolean().describe('Whether the authentication was successful'),
      visitorId: z.string().optional().describe('The ID of the authenticated visitor'),
      name: z.string().optional().describe('Name of the authenticated visitor'),
      email: z.string().optional().describe('Email of the authenticated visitor')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Authenticating visitor...');
    let result = await client.authenticateVisitor(ctx.input.username, ctx.input.password);
    return {
      output: {
        authenticated: true,
        visitorId: result?.id !== undefined ? String(result.id) : undefined,
        name: result?.name || undefined,
        email: result?.email || undefined
      },
      message: `Visitor "${ctx.input.username}" authenticated successfully.`
    };
  })
  .build();
