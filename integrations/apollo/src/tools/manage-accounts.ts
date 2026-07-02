import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { apolloServiceError } from '../lib/errors';
import { spec } from '../spec';

let accountFieldsSchema = z.object({
  name: z.string().optional().describe('Account/company name'),
  domain: z.string().optional().describe('Company domain, e.g. "apollo.io"'),
  phone: z.string().optional().describe('Company phone number'),
  ownerId: z.string().optional().describe('Apollo user ID of the account owner'),
  accountStageId: z.string().optional().describe('Account stage ID'),
  websiteUrl: z.string().optional().describe('Company website URL'),
  linkedinUrl: z.string().optional().describe('Company LinkedIn URL'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State or region'),
  country: z.string().optional().describe('Country')
});

let createAccountFieldsSchema = accountFieldsSchema.extend({
  name: z.string().describe('Account/company name')
});

let accountOutputSchema = z.object({
  accountId: z.string().optional(),
  name: z.string().optional(),
  domain: z.string().optional(),
  websiteUrl: z.string().optional(),
  phone: z.string().optional(),
  ownerId: z.string().optional(),
  accountStageId: z.string().optional(),
  organizationId: z.string().optional(),
  industry: z.string().optional(),
  linkedinUrl: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
});

let optionalString = (value: unknown) =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

let formatAccount = (a: Record<string, any>) => ({
  accountId: optionalString(a.id),
  name: optionalString(a.name),
  domain: optionalString(a.domain) || optionalString(a.primary_domain),
  websiteUrl: optionalString(a.website_url),
  phone: optionalString(a.phone),
  ownerId: optionalString(a.owner_id),
  accountStageId: optionalString(a.account_stage_id),
  organizationId: optionalString(a.organization_id),
  industry: optionalString(a.industry),
  linkedinUrl: optionalString(a.linkedin_url),
  city: optionalString(a.city),
  state: optionalString(a.state),
  country: optionalString(a.country),
  createdAt: optionalString(a.created_at),
  updatedAt: optionalString(a.updated_at)
});

export let searchAccounts = SlateTool.create(spec, {
  name: 'Search Accounts',
  key: 'search_accounts',
  description: `Search for accounts (companies) that have been added to your Apollo database. Returns accounts your team has explicitly added — use Search Organizations for the broader Apollo company database.`,
  constraints: [
    'Maximum 50,000 results (100 per page, up to 500 pages)',
    "Only returns accounts in your team's database"
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keywords: z.string().optional().describe('Keywords to search accounts'),
      accountStageIds: z.array(z.string()).optional().describe('Filter by account stage IDs'),
      sortByField: z.string().optional().describe('Field to sort results by'),
      sortAscending: z
        .boolean()
        .optional()
        .describe('Sort in ascending order (default: false)'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (default: 25, max: 100)')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountOutputSchema),
      totalEntries: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.searchAccounts({
      qKeywords: ctx.input.keywords,
      accountStageIds: ctx.input.accountStageIds,
      sortByField: ctx.input.sortByField,
      sortAscending: ctx.input.sortAscending,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let accounts = result.accounts.map(formatAccount);

    return {
      output: {
        accounts,
        totalEntries: result.pagination?.total_entries,
        currentPage: result.pagination?.page,
        totalPages: result.pagination?.total_pages
      },
      message: `Found **${result.pagination?.total_entries ?? accounts.length}** accounts (page ${result.pagination?.page ?? 1} of ${result.pagination?.total_pages ?? 1}). Returned ${accounts.length} results.`
    };
  })
  .build();

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description:
    'Retrieve details for an existing Apollo account in your team database by account ID.',
  constraints: ['Requires a master API key'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('The Apollo account ID to retrieve')
    })
  )
  .output(
    z.object({
      account: accountOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.getAccount(ctx.input.accountId);
    let account = formatAccount(result.account);

    return {
      output: { account },
      message: `Retrieved account **${account.name || account.accountId}**.`
    };
  })
  .build();

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  description: `Create a new account (company) in your Apollo database. Accounts represent companies your team is tracking.`,
  instructions: [
    'Apollo does not deduplicate accounts automatically. If a matching account already exists, a new one will be created.'
  ],
  tags: {
    destructive: false
  }
})
  .input(createAccountFieldsSchema)
  .output(
    z.object({
      accountId: z.string().optional(),
      name: z.string().optional(),
      domain: z.string().optional(),
      websiteUrl: z.string().optional(),
      createdAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.createAccount({
      name: ctx.input.name,
      domain: ctx.input.domain,
      phone: ctx.input.phone,
      ownerId: ctx.input.ownerId,
      accountStageId: ctx.input.accountStageId,
      websiteUrl: ctx.input.websiteUrl,
      linkedinUrl: ctx.input.linkedinUrl,
      city: ctx.input.city,
      state: ctx.input.state,
      country: ctx.input.country
    });

    let account = formatAccount(result.account);
    return {
      output: {
        accountId: account.accountId,
        name: account.name,
        domain: account.domain,
        websiteUrl: account.websiteUrl,
        createdAt: account.createdAt
      },
      message: `Created account **${account.name}** (ID: ${account.accountId}).`
    };
  })
  .build();

export let bulkCreateAccounts = SlateTool.create(spec, {
  name: 'Bulk Create Accounts',
  key: 'bulk_create_accounts',
  description:
    'Create up to 100 Apollo accounts in one request. Apollo returns created and existing account records separately when deduplication finds matches.',
  constraints: ['Requires a master API key', 'Maximum 100 accounts per request'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accounts: z
        .array(createAccountFieldsSchema)
        .describe('Accounts to create. Maximum 100 accounts.'),
      appendLabelNames: z
        .array(z.string())
        .optional()
        .describe('Label names to append to all created accounts'),
      runDedupe: z
        .boolean()
        .optional()
        .describe('Enable deduplication by domain, organization ID, and name')
    })
  )
  .output(
    z.object({
      createdAccounts: z.array(accountOutputSchema),
      existingAccounts: z.array(accountOutputSchema),
      createdCount: z.number(),
      existingCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.accounts.length === 0) {
      throw apolloServiceError('At least one account is required.');
    }
    if (ctx.input.accounts.length > 100) {
      throw apolloServiceError('Bulk create accounts supports up to 100 accounts.');
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.bulkCreateAccounts({
      accounts: ctx.input.accounts,
      appendLabelNames: ctx.input.appendLabelNames,
      runDedupe: ctx.input.runDedupe
    });
    let createdAccounts = result.createdAccounts.map(formatAccount);
    let existingAccounts = result.existingAccounts.map(formatAccount);

    return {
      output: {
        createdAccounts,
        existingAccounts,
        createdCount: createdAccounts.length,
        existingCount: existingAccounts.length
      },
      message: `Bulk account create finished: **${createdAccounts.length}** created, **${existingAccounts.length}** existing.`
    };
  })
  .build();

export let updateAccount = SlateTool.create(spec, {
  name: 'Update Account',
  key: 'update_account',
  description: `Update an existing account in your Apollo database. Provide the account ID and any fields you want to change. Only the provided fields will be updated.`,
  tags: {
    destructive: false
  }
})
  .input(
    z
      .object({
        accountId: z.string().describe('The Apollo account ID to update')
      })
      .merge(accountFieldsSchema)
  )
  .output(
    z.object({
      accountId: z.string().optional(),
      name: z.string().optional(),
      domain: z.string().optional(),
      websiteUrl: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });

    let result = await client.updateAccount(ctx.input.accountId, {
      name: ctx.input.name,
      domain: ctx.input.domain,
      phone: ctx.input.phone,
      ownerId: ctx.input.ownerId,
      accountStageId: ctx.input.accountStageId,
      websiteUrl: ctx.input.websiteUrl,
      linkedinUrl: ctx.input.linkedinUrl,
      city: ctx.input.city,
      state: ctx.input.state,
      country: ctx.input.country
    });

    let account = formatAccount(result.account);
    return {
      output: {
        accountId: account.accountId,
        name: account.name,
        domain: account.domain,
        websiteUrl: account.websiteUrl,
        updatedAt: account.updatedAt
      },
      message: `Updated account **${account.name || account.accountId}**.`
    };
  })
  .build();

export let bulkUpdateAccounts = SlateTool.create(spec, {
  name: 'Bulk Update Accounts',
  key: 'bulk_update_accounts',
  description:
    'Update multiple Apollo accounts. Provide accountIds plus common update fields, or accounts with individual accountId-specific updates.',
  instructions: [
    'Use accountIds when applying the same fields to multiple accounts.',
    'Use accounts when each account needs different update fields.',
    'The async flag is only supported with accountIds.'
  ],
  constraints: ['Requires a master API key', 'Maximum 1000 accounts per request'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountIds: z
        .array(z.string())
        .optional()
        .describe('Account IDs to update with the same common fields'),
      accounts: z
        .array(
          z
            .object({
              accountId: z.string().describe('Apollo account ID to update')
            })
            .merge(accountFieldsSchema)
        )
        .optional()
        .describe('Account-specific updates'),
      name: z.string().optional().describe('Common account name update for accountIds mode'),
      domain: z.string().optional().describe('Common domain update for accountIds mode'),
      phone: z.string().optional().describe('Common phone update for accountIds mode'),
      ownerId: z.string().optional().describe('Common owner update for accountIds mode'),
      accountStageId: z
        .string()
        .optional()
        .describe('Common stage update for accountIds mode'),
      async: z
        .boolean()
        .optional()
        .describe('Process asynchronously. Only valid with accountIds mode.')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountOutputSchema),
      accountsUpdated: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let hasAccountIds = Boolean(ctx.input.accountIds?.length);
    let hasAccounts = Boolean(ctx.input.accounts?.length);

    if (hasAccountIds === hasAccounts) {
      throw apolloServiceError('Provide either accountIds or accounts, but not both.');
    }
    if (ctx.input.accountIds && ctx.input.accountIds.length > 1000) {
      throw apolloServiceError('Bulk update accounts supports up to 1000 account IDs.');
    }
    if (ctx.input.accounts && ctx.input.accounts.length > 1000) {
      throw apolloServiceError('Bulk update accounts supports up to 1000 accounts.');
    }
    if (hasAccounts && ctx.input.async) {
      throw apolloServiceError('async is only supported when using accountIds.');
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.bulkUpdateAccounts({
      accountIds: ctx.input.accountIds,
      accountAttributes: ctx.input.accounts,
      updates: {
        name: ctx.input.name,
        domain: ctx.input.domain,
        phone: ctx.input.phone,
        ownerId: ctx.input.ownerId,
        accountStageId: ctx.input.accountStageId
      },
      async: ctx.input.async
    });
    let accounts = result.accounts.map(formatAccount);

    return {
      output: {
        accounts,
        accountsUpdated:
          accounts.length || ctx.input.accountIds?.length || ctx.input.accounts?.length || 0
      },
      message: `Bulk account update submitted for **${ctx.input.accountIds?.length || ctx.input.accounts?.length || accounts.length}** account(s).`
    };
  })
  .build();

export let updateAccountOwners = SlateTool.create(spec, {
  name: 'Update Account Owners',
  key: 'update_account_owners',
  description: 'Assign one or more Apollo accounts to a different owner user.',
  constraints: ['Requires a master API key'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      accountIds: z.array(z.string()).describe('Apollo account IDs to assign'),
      ownerId: z.string().describe('Apollo user ID of the new account owner')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountOutputSchema),
      accountsUpdated: z.number()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.accountIds.length === 0) {
      throw apolloServiceError('At least one account ID is required.');
    }

    let client = new Client({ token: ctx.auth.token, authType: ctx.auth.authType });
    let result = await client.updateAccountOwners(ctx.input.accountIds, ctx.input.ownerId);
    let accounts = result.accounts.map(formatAccount);

    return {
      output: {
        accounts,
        accountsUpdated: ctx.input.accountIds.length
      },
      message: `Updated owner for **${ctx.input.accountIds.length}** account(s).`
    };
  })
  .build();
