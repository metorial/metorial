import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let accountOutputSchema = z.object({
  accountId: z.number().describe('SalesLoft account ID'),
  name: z.string().nullable().optional().describe('Account name'),
  domain: z.string().nullable().optional().describe('Domain'),
  website: z.string().nullable().optional().describe('Website URL'),
  description: z.string().nullable().optional().describe('Account description'),
  phone: z.string().nullable().optional().describe('Phone number'),
  linkedinUrl: z.string().nullable().optional().describe('LinkedIn URL'),
  twitterHandle: z.string().nullable().optional().describe('Twitter handle'),
  street: z.string().nullable().optional().describe('Street address'),
  city: z.string().nullable().optional().describe('City'),
  state: z.string().nullable().optional().describe('State/Province'),
  postalCode: z.string().nullable().optional().describe('Postal code'),
  country: z.string().nullable().optional().describe('Country'),
  industry: z.string().nullable().optional().describe('Industry'),
  companyType: z.string().nullable().optional().describe('Company type'),
  size: z.string().nullable().optional().describe('Company size'),
  founded: z.string().nullable().optional().describe('Year founded'),
  revenueRange: z.string().nullable().optional().describe('Revenue range'),
  doNotContact: z.boolean().nullable().optional().describe('Do-not-contact flag'),
  ownerId: z.number().nullable().optional().describe('Owner user ID'),
  customFields: z.record(z.string(), z.any()).nullable().optional().describe('Custom fields'),
  tags: z.array(z.string()).nullable().optional().describe('Tags'),
  crmId: z.string().nullable().optional().describe('CRM ID'),
  createdAt: z.string().nullable().optional().describe('Creation timestamp'),
  updatedAt: z.string().nullable().optional().describe('Last update timestamp')
});

let mapAccount = (raw: any) => ({
  accountId: raw.id,
  name: raw.name,
  domain: raw.domain,
  website: raw.website,
  description: raw.description,
  phone: raw.phone,
  linkedinUrl: raw.linkedin_url,
  twitterHandle: raw.twitter_handle,
  street: raw.street,
  city: raw.city,
  state: raw.state,
  postalCode: raw.postal_code,
  country: raw.country,
  industry: raw.industry,
  companyType: raw.company_type,
  size: raw.size,
  founded: raw.founded,
  revenueRange: raw.revenue_range,
  doNotContact: raw.do_not_contact,
  ownerId: raw.owner?.id ?? null,
  customFields: raw.custom_fields,
  tags: raw.tags,
  crmId: raw.crm_id,
  createdAt: raw.created_at,
  updatedAt: raw.updated_at
});

let paginationOutputSchema = z.object({
  perPage: z.number().describe('Results per page'),
  currentPage: z.number().describe('Current page number'),
  nextPage: z.number().nullable().describe('Next page number'),
  prevPage: z.number().nullable().describe('Previous page number')
});

export let createAccount = SlateTool.create(spec, {
  name: 'Create Account',
  key: 'create_account',
  description: `Create a new account (company) in SalesLoft. Name and domain are required. Supports setting company details, address, industry, and custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Account/company name'),
      domain: z.string().describe('Company domain (e.g., "example.com")'),
      website: z.string().optional().describe('Website URL'),
      description: z.string().optional().describe('Account description'),
      phone: z.string().optional().describe('Phone number'),
      linkedinUrl: z.string().optional().describe('LinkedIn URL'),
      twitterHandle: z.string().optional().describe('Twitter handle'),
      street: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/Province'),
      postalCode: z.string().optional().describe('Postal code'),
      country: z.string().optional().describe('Country'),
      industry: z.string().optional().describe('Industry'),
      companyType: z.string().optional().describe('Company type'),
      size: z.string().optional().describe('Company size'),
      founded: z.string().optional().describe('Year founded'),
      revenueRange: z.string().optional().describe('Revenue range'),
      ownerId: z.number().optional().describe('Owner user ID'),
      tags: z.array(z.string()).optional().describe('Tags to apply'),
      customFields: z.record(z.string(), z.any()).optional().describe('Custom field values'),
      doNotContact: z.boolean().optional().describe('Do-not-contact flag')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {
      name: ctx.input.name,
      domain: ctx.input.domain
    };
    if (ctx.input.website) body.website = ctx.input.website;
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.phone) body.phone = ctx.input.phone;
    if (ctx.input.linkedinUrl) body.linkedin_url = ctx.input.linkedinUrl;
    if (ctx.input.twitterHandle) body.twitter_handle = ctx.input.twitterHandle;
    if (ctx.input.street) body.street = ctx.input.street;
    if (ctx.input.city) body.city = ctx.input.city;
    if (ctx.input.state) body.state = ctx.input.state;
    if (ctx.input.postalCode) body.postal_code = ctx.input.postalCode;
    if (ctx.input.country) body.country = ctx.input.country;
    if (ctx.input.industry) body.industry = ctx.input.industry;
    if (ctx.input.companyType) body.company_type = ctx.input.companyType;
    if (ctx.input.size) body.size = ctx.input.size;
    if (ctx.input.founded) body.founded = ctx.input.founded;
    if (ctx.input.revenueRange) body.revenue_range = ctx.input.revenueRange;
    if (ctx.input.ownerId) body.owner_id = ctx.input.ownerId;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.customFields) body.custom_fields = ctx.input.customFields;
    if (ctx.input.doNotContact !== undefined) body.do_not_contact = ctx.input.doNotContact;

    let account = await client.createAccount(body);
    let output = mapAccount(account);

    return {
      output,
      message: `Created account **${output.name}** (ID: ${output.accountId}).`
    };
  })
  .build();

export let updateAccount = SlateTool.create(spec, {
  name: 'Update Account',
  key: 'update_account',
  description: `Update an existing account (company) in SalesLoft. Provide the account ID and any fields to update.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account to update'),
      name: z.string().optional().describe('Updated name'),
      domain: z.string().optional().describe('Updated domain'),
      website: z.string().optional().describe('Updated website URL'),
      description: z.string().optional().describe('Updated description'),
      phone: z.string().optional().describe('Updated phone number'),
      linkedinUrl: z.string().optional().describe('Updated LinkedIn URL'),
      twitterHandle: z.string().optional().describe('Updated Twitter handle'),
      street: z.string().optional().describe('Updated street address'),
      city: z.string().optional().describe('Updated city'),
      state: z.string().optional().describe('Updated state'),
      postalCode: z.string().optional().describe('Updated postal code'),
      country: z.string().optional().describe('Updated country'),
      industry: z.string().optional().describe('Updated industry'),
      ownerId: z.number().optional().describe('Updated owner user ID'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      customFields: z.record(z.string(), z.any()).optional().describe('Updated custom fields'),
      doNotContact: z.boolean().optional().describe('Updated do-not-contact flag')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let body: Record<string, any> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.domain !== undefined) body.domain = ctx.input.domain;
    if (ctx.input.website !== undefined) body.website = ctx.input.website;
    if (ctx.input.description !== undefined) body.description = ctx.input.description;
    if (ctx.input.phone !== undefined) body.phone = ctx.input.phone;
    if (ctx.input.linkedinUrl !== undefined) body.linkedin_url = ctx.input.linkedinUrl;
    if (ctx.input.twitterHandle !== undefined) body.twitter_handle = ctx.input.twitterHandle;
    if (ctx.input.street !== undefined) body.street = ctx.input.street;
    if (ctx.input.city !== undefined) body.city = ctx.input.city;
    if (ctx.input.state !== undefined) body.state = ctx.input.state;
    if (ctx.input.postalCode !== undefined) body.postal_code = ctx.input.postalCode;
    if (ctx.input.country !== undefined) body.country = ctx.input.country;
    if (ctx.input.industry !== undefined) body.industry = ctx.input.industry;
    if (ctx.input.ownerId !== undefined) body.owner_id = ctx.input.ownerId;
    if (ctx.input.tags !== undefined) body.tags = ctx.input.tags;
    if (ctx.input.customFields !== undefined) body.custom_fields = ctx.input.customFields;
    if (ctx.input.doNotContact !== undefined) body.do_not_contact = ctx.input.doNotContact;

    let account = await client.updateAccount(ctx.input.accountId, body);
    let output = mapAccount(account);

    return {
      output,
      message: `Updated account **${output.name}** (ID: ${output.accountId}).`
    };
  })
  .build();

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Fetch a single account (company) from SalesLoft by ID. Returns full company details, address, industry, tags, and custom fields.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account to fetch')
    })
  )
  .output(accountOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let account = await client.getAccount(ctx.input.accountId);
    let output = mapAccount(account);

    return {
      output,
      message: `Fetched account **${output.name}** (ID: ${output.accountId}).`
    };
  })
  .build();

export let deleteAccount = SlateTool.create(spec, {
  name: 'Delete Account',
  key: 'delete_account',
  description: `Permanently delete an account (company) from SalesLoft. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account to delete')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('ID of the deleted account'),
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteAccount(ctx.input.accountId);

    return {
      output: {
        accountId: ctx.input.accountId,
        deleted: true
      },
      message: `Deleted account with ID ${ctx.input.accountId}.`
    };
  })
  .build();

export let listAccounts = SlateTool.create(spec, {
  name: 'List Accounts',
  key: 'list_accounts',
  description: `List accounts (companies) in SalesLoft with optional filtering by domain or name. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (1-100, default: 25)'),
      sortBy: z
        .string()
        .optional()
        .describe('Field to sort by (e.g., "updated_at", "created_at", "name")'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      domain: z.string().optional().describe('Filter by domain'),
      name: z.string().optional().describe('Filter by exact account name')
    })
  )
  .output(
    z.object({
      accounts: z.array(accountOutputSchema).describe('List of accounts'),
      paging: paginationOutputSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listAccounts(ctx.input);
    let accounts = result.data.map(mapAccount);

    return {
      output: {
        accounts,
        paging: result.metadata.paging
      },
      message: `Found **${accounts.length}** accounts (page ${result.metadata.paging.currentPage}).`
    };
  })
  .build();
