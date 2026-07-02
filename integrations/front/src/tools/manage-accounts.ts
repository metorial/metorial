import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let accountOutputSchema = z.object({
  accountId: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  domains: z.array(z.string()),
  externalId: z.string().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  createdAt: z.number(),
  updatedAt: z.number()
});

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List company/organization accounts in Front with optional pagination and sorting.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageToken: z.string().optional().describe('Pagination token'),
      limit: z.number().optional().describe('Maximum number of results'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountOutputSchema),
      nextPageToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAccounts({
      page_token: ctx.input.pageToken,
      limit: ctx.input.limit,
      sort_by: ctx.input.sortBy,
      sort_order: ctx.input.sortOrder
    });

    let accounts = result._results.map(a => ({
      accountId: a.id,
      name: a.name,
      description: a.description,
      domains: a.domains,
      externalId: a.external_id,
      customFields: a.custom_fields,
      createdAt: a.created_at,
      updatedAt: a.updated_at
    }));

    return {
      output: { accounts, nextPageToken: result._pagination?.next || undefined },
      message: `Found **${accounts.length}** accounts.`
    };
  });

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve detailed information about a specific account, optionally including its associated contacts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: z.string().describe('ID of the account'),
      includeContacts: z
        .boolean()
        .optional()
        .describe('Whether to include contacts associated with this account')
    })
  )
  .output(
    z.object({
      account: accountOutputSchema,
      contacts: z
        .array(
          z.object({
            contactId: z.string(),
            name: z.string().optional(),
            handles: z.array(
              z.object({
                handle: z.string(),
                source: z.string()
              })
            )
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.getAccount(ctx.input.accountId);

    let contacts: any;
    if (ctx.input.includeContacts) {
      let contactResult = await client.listAccountContacts(ctx.input.accountId);
      contacts = contactResult._results.map(c => ({
        contactId: c.id,
        name: c.name,
        handles: c.handles
      }));
    }

    return {
      output: {
        account: {
          accountId: account.id,
          name: account.name,
          description: account.description,
          domains: account.domains,
          externalId: account.external_id,
          customFields: account.custom_fields,
          createdAt: account.created_at,
          updatedAt: account.updated_at
        },
        contacts
      },
      message: `Retrieved account **${account.name || account.id}**${contacts ? ` with ${contacts.length} contacts` : ''}.`
    };
  });

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  description: `Create a new company/organization account in Front.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Account name'),
      description: z.string().optional().describe('Account description'),
      domains: z.array(z.string()).optional().describe('Associated domain names'),
      externalId: z.string().optional().describe('External system identifier'),
      customFields: z.record(z.string(), z.string()).optional().describe('Custom field values')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.createAccount({
      name: ctx.input.name,
      description: ctx.input.description,
      domains: ctx.input.domains,
      external_id: ctx.input.externalId,
      custom_fields: ctx.input.customFields
    });

    return {
      output: {
        accountId: account.id,
        name: account.name,
        description: account.description,
        domains: account.domains,
        externalId: account.external_id,
        customFields: account.custom_fields,
        createdAt: account.created_at,
        updatedAt: account.updated_at
      },
      message: `Created account **${account.name}**.`
    };
  });

export let updateAccount = SlateTool.create(spec, {
  name: 'Update Account',
  key: 'update_account',
  description: `Update an existing account's information. Supports managing associated contacts by adding or removing them.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      accountId: z.string().describe('ID of the account to update'),
      name: z.string().optional().describe('Updated name'),
      description: z.string().optional().describe('Updated description'),
      domains: z.array(z.string()).optional().describe('Updated domain names'),
      externalId: z.string().optional().describe('Updated external ID'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Updated custom field values'),
      addContactIds: z
        .array(z.string())
        .optional()
        .describe('Contact IDs to add to this account'),
      removeContactIds: z
        .array(z.string())
        .optional()
        .describe('Contact IDs to remove from this account')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let account = await client.updateAccount(ctx.input.accountId, {
      name: ctx.input.name,
      description: ctx.input.description,
      domains: ctx.input.domains,
      external_id: ctx.input.externalId,
      custom_fields: ctx.input.customFields
    });

    if (ctx.input.addContactIds && ctx.input.addContactIds.length > 0) {
      await client.addContactToAccount(ctx.input.accountId, ctx.input.addContactIds);
    }

    if (ctx.input.removeContactIds && ctx.input.removeContactIds.length > 0) {
      await client.removeContactFromAccount(ctx.input.accountId, ctx.input.removeContactIds);
    }

    return {
      output: {
        accountId: account.id,
        name: account.name,
        description: account.description,
        domains: account.domains,
        externalId: account.external_id,
        customFields: account.custom_fields,
        createdAt: account.created_at,
        updatedAt: account.updated_at
      },
      message: `Updated account **${account.name || account.id}**.`
    };
  });

export let deleteAccount = SlateTool.create(spec, {
  name: 'Delete Account',
  key: 'delete_account',
  description: `Permanently delete an account from Front. This action cannot be undone.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      accountId: z.string().describe('ID of the account to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteAccount(ctx.input.accountId);

    return {
      output: { deleted: true },
      message: `Deleted account ${ctx.input.accountId}.`
    };
  });
