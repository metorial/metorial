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
  .input(
    z.object({
      continueToken: z.string().optional().describe('Token for the next page of subaccounts'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .optional()
        .describe('Number of subaccounts per page; default 100'),
      searchTerms: z
        .array(z.string())
        .optional()
        .describe('Search names, email addresses, and IDs')
    })
  )
  .output(
    z.object({
      subaccounts: z.array(z.any()).describe('List of subaccounts'),
      continueToken: z.string().optional().describe('Token for the next page'),
      totalCount: z.number().optional().describe('Number of matching subaccounts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.viewSubaccounts(ctx.input);
    let data = result.data || result;

    return {
      output: {
        subaccounts: data.subaccounts || [],
        continueToken: data.continue_token || undefined,
        totalCount: data.total_count
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
      email: z
        .string()
        .optional()
        .describe(
          'Email address to invite as the first team member; also used as name if name is omitted'
        ),
      password: z
        .string()
        .optional()
        .describe('Omit this field; SMTP2GO creates subaccounts through email invitations'),
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
      message: `Subaccount **${data.name ?? ctx.input.name ?? ctx.input.email}** created.`
    };
  })
  .build();

export let editSubaccount = SlateTool.create(spec, {
  name: 'Edit Subaccount',
  key: 'edit_subaccount',
  description: `Update a subaccount's display name.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      subaccountId: z.string().describe('ID of the subaccount to edit'),
      email: z
        .string()
        .optional()
        .describe('Omit this field; the API cannot update the subaccount email'),
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
