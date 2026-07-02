import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSmtpUsers = SlateTool.create(spec, {
  name: 'List SMTP Users',
  key: 'list_smtp_users',
  description: `List all SMTP user credentials configured in your SMTP2GO account. SMTP users authenticate when sending via SMTP relay.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      smtpUsers: z.array(z.any()).describe('List of SMTP users')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.viewSmtpUsers({
      subaccountId: ctx.input.subaccountId
    });
    let data = result.data || result;

    return {
      output: {
        smtpUsers: data.smtp_users || data.results || data
      },
      message: `Retrieved SMTP users.`
    };
  })
  .build();

export let addSmtpUser = SlateTool.create(spec, {
  name: 'Add SMTP User',
  key: 'add_smtp_user',
  description: `Create a new SMTP user credential for authenticating via SMTP relay. Each SMTP user can have individual settings for open tracking, click tracking, and rate limits.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Username for the SMTP user'),
      password: z.string().describe('Password for the SMTP user'),
      description: z.string().optional().describe('Description for the SMTP user'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      username: z.string().describe('Created SMTP username')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.addSmtpUser(ctx.input);

    return {
      output: {
        username: ctx.input.username
      },
      message: `SMTP user **${ctx.input.username}** created.`
    };
  })
  .build();

export let editSmtpUser = SlateTool.create(spec, {
  name: 'Edit SMTP User',
  key: 'edit_smtp_user',
  description: `Update an existing SMTP user's password or description.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Username of the SMTP user to edit'),
      password: z.string().optional().describe('New password'),
      description: z.string().optional().describe('New description'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      username: z.string().describe('Updated SMTP username')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.editSmtpUser(ctx.input);

    return {
      output: {
        username: ctx.input.username
      },
      message: `SMTP user **${ctx.input.username}** updated.`
    };
  })
  .build();

export let removeSmtpUser = SlateTool.create(spec, {
  name: 'Remove SMTP User',
  key: 'remove_smtp_user',
  description: `Remove an SMTP user credential. The user will no longer be able to authenticate via SMTP relay.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Username of the SMTP user to remove'),
      subaccountId: z.string().optional().describe('Subaccount ID')
    })
  )
  .output(
    z.object({
      username: z.string().describe('Removed SMTP username')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.removeSmtpUser(ctx.input);

    return {
      output: {
        username: ctx.input.username
      },
      message: `SMTP user **${ctx.input.username}** removed.`
    };
  })
  .build();
