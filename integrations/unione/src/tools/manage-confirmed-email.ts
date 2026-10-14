import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let confirmedEmailSchema = z.object({
  email: z.string().describe('Email address registered for sandbox sending'),
  status: z.string().describe('Confirmation status returned by UniOne')
});

export let createConfirmedEmail = SlateTool.create(spec, {
  name: 'Confirm Email for Sandbox Sending',
  key: 'create_confirmed_email',
  description:
    'Register an email address for sandbox-domain sending and request a confirmation link. Use list_confirmed_emails to check its confirmation status.',
  constraints: ['Requires a main account API key. Project API keys are not supported.'],
  tags: { readOnly: false, destructive: false }
})
  .input(z.object({ email: z.string().describe('Email address to register and confirm') }))
  .output(confirmedEmailSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, datacenter: ctx.config.datacenter });
    let result = await client.createConfirmedEmail(ctx.input.email);
    return {
      output: result.confirmed_email,
      message: `Registered **${result.confirmed_email.email}** for confirmation. Status: **${result.confirmed_email.status}**.`
    };
  })
  .build();

export let listConfirmedEmails = SlateTool.create(spec, {
  name: 'List Confirmed Emails',
  key: 'list_confirmed_emails',
  description:
    'List confirmed and unconfirmed email addresses registered for sandbox-domain sending.',
  constraints: ['Requires a main account API key. Project API keys are not supported.'],
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      emails: z
        .array(confirmedEmailSchema)
        .describe('Registered email addresses and confirmation statuses')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, datacenter: ctx.config.datacenter });
    let result = await client.listConfirmedEmails();
    return {
      output: { emails: result.confirmed_emails },
      message: `Found **${result.confirmed_emails.length}** registered email address(es).`
    };
  })
  .build();

export let deleteConfirmedEmail = SlateTool.create(spec, {
  name: 'Delete Confirmed Email',
  key: 'delete_confirmed_email',
  description:
    'Remove an email address from the sandbox-domain confirmed email list. This may prevent future sandbox messages involving that address.',
  constraints: ['Requires a main account API key. Project API keys are not supported.'],
  tags: { readOnly: false, destructive: true }
})
  .input(z.object({ email: z.string().describe('Registered email address to remove') }))
  .output(z.object({ success: z.boolean().describe('Whether the address was removed') }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, datacenter: ctx.config.datacenter });
    let result = await client.deleteConfirmedEmail(ctx.input.email);
    return {
      output: { success: result.status === 'success' },
      message: `Removed **${ctx.input.email}** from the confirmed email list.`
    };
  })
  .build();
