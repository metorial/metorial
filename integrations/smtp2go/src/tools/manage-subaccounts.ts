import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubaccounts = SlateTool.create(spec, {
  name: 'List Subaccounts',
  key: 'list_subaccounts',
  description: `List all subaccounts under your main SMTP2GO account. Available on paid plans only.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      subaccounts: z.array(z.any()).describe('List of subaccounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.viewSubaccounts();
    let data = result.data || result;

    return {
      output: {
        subaccounts: data.subaccounts || data
      },
      message: `Retrieved subaccounts.`
    };
  })
  .build();

export let createSubaccount = SlateTool.create(spec, {
  name: 'Create Subaccount',
  key: 'create_subaccount',
  description: `Create a new subaccount under your main account to manage clients, departments, or projects with isolated settings and reports.`,
  constraints: ['Available on paid plans only.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address for the subaccount'),
      password: z.string().describe('Password for the subaccount'),
      name: z.string().optional().describe('Display name for the subaccount')
    })
  )
  .output(
    z.object({
      subaccount: z.any().describe('Created subaccount details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.addSubaccount(ctx.input);
    let data = result.data || result;

    return {
      output: {
        subaccount: data
      },
      message: `Subaccount created for **${ctx.input.email}**.`
    };
  })
  .build();

export let editSubaccount = SlateTool.create(spec, {
  name: 'Edit Subaccount',
  key: 'edit_subaccount',
  description: `Update a subaccount's email or display name.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subaccountId: z.string().describe('ID of the subaccount to edit'),
      email: z.string().optional().describe('New email address'),
      name: z.string().optional().describe('New display name')
    })
  )
  .output(
    z.object({
      subaccount: z.any().describe('Updated subaccount details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.editSubaccount(ctx.input);
    let data = result.data || result;

    return {
      output: {
        subaccount: data
      },
      message: `Subaccount **${ctx.input.subaccountId}** updated.`
    };
  })
  .build();

export let closeSubaccount = SlateTool.create(spec, {
  name: 'Close Subaccount',
  key: 'close_subaccount',
  description: `Close a subaccount. The subaccount will be deactivated but can be reopened later.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      subaccountId: z.string().describe('ID of the subaccount to close')
    })
  )
  .output(
    z.object({
      subaccountId: z.string().describe('ID of the closed subaccount')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.closeSubaccount(ctx.input);

    return {
      output: {
        subaccountId: ctx.input.subaccountId
      },
      message: `Subaccount **${ctx.input.subaccountId}** closed.`
    };
  })
  .build();

export let reopenSubaccount = SlateTool.create(spec, {
  name: 'Reopen Subaccount',
  key: 'reopen_subaccount',
  description: `Reopen a previously closed subaccount to reactivate it.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subaccountId: z.string().describe('ID of the subaccount to reopen')
    })
  )
  .output(
    z.object({
      subaccountId: z.string().describe('ID of the reopened subaccount')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    await client.reopenSubaccount(ctx.input);

    return {
      output: {
        subaccountId: ctx.input.subaccountId
      },
      message: `Subaccount **${ctx.input.subaccountId}** reopened.`
    };
  })
  .build();
