import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createClientAccount = SlateTool.create(spec, {
  name: 'Create Client Account',
  key: 'create_client_account',
  description: `Provision a new client sub-account under your agency Hyperise account. Each sub-account can have its own custom domain, team members, and image templates. **Requires an Agency or White Label plan.**`,
  constraints: ['Only available on Hyperise Agency and White Label plans.']
})
  .input(
    z.object({
      businessId: z
        .string()
        .describe('Your agency business ID under which the sub-account will be created'),
      clientName: z.string().describe('Name of the client account'),
      clientEmail: z.string().describe('Email address for the client account')
    })
  )
  .output(
    z
      .object({
        clientId: z.string().optional().describe('ID of the created client sub-account'),
        clientName: z.string().optional().describe('Name of the created client'),
        clientEmail: z.string().optional().describe('Email of the created client')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createClientAccount({
      business_id: ctx.input.businessId,
      name: ctx.input.clientName,
      email: ctx.input.clientEmail
    });

    let account = result?.data ?? result;

    return {
      output: {
        clientId: (account.id ?? account.client_id)?.toString(),
        clientName: account.name || ctx.input.clientName,
        clientEmail: account.email || ctx.input.clientEmail,
        ...account
      },
      message: `Created client account **${ctx.input.clientName}** (${ctx.input.clientEmail}).`
    };
  })
  .build();
