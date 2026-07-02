import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageAccount = SlateTool.create(spec, {
  name: 'Manage Account',
  key: 'manage_account',
  description: `Create, update, or upsert an account (company) in Freshsales.
Accounts represent companies with whom you have a business relationship. Use **uniqueIdentifier** to upsert by name or other unique fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z
        .number()
        .optional()
        .describe('ID of the account to update. Omit to create.'),
      uniqueIdentifier: z
        .record(z.string(), z.any())
        .optional()
        .describe('Unique identifier for upsert, e.g. { "name": "Acme Corp" }'),
      name: z.string().optional().describe('Company name'),
      address: z.string().optional().describe('Street address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State or province'),
      zipcode: z.string().optional().describe('Postal/zip code'),
      country: z.string().optional().describe('Country'),
      phone: z.string().optional().describe('Phone number'),
      website: z.string().optional().describe('Company website URL'),
      numberOfEmployees: z.number().optional().describe('Number of employees'),
      annualRevenue: z.number().optional().describe('Annual revenue'),
      industryTypeId: z.number().optional().describe('Industry type ID'),
      businessTypeId: z.number().optional().describe('Business type ID'),
      ownerId: z.number().optional().describe('Assigned user ID'),
      territoryId: z.number().optional().describe('Territory ID'),
      parentSalesAccountId: z.number().optional().describe('Parent account ID'),
      customFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields as key-value pairs')
    })
  )
  .output(
    z.object({
      accountId: z.number().describe('ID of the account'),
      name: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let accountData: Record<string, any> = {};
    if (ctx.input.name !== undefined) accountData.name = ctx.input.name;
    if (ctx.input.address !== undefined) accountData.address = ctx.input.address;
    if (ctx.input.city !== undefined) accountData.city = ctx.input.city;
    if (ctx.input.state !== undefined) accountData.state = ctx.input.state;
    if (ctx.input.zipcode !== undefined) accountData.zipcode = ctx.input.zipcode;
    if (ctx.input.country !== undefined) accountData.country = ctx.input.country;
    if (ctx.input.phone !== undefined) accountData.phone = ctx.input.phone;
    if (ctx.input.website !== undefined) accountData.website = ctx.input.website;
    if (ctx.input.numberOfEmployees !== undefined)
      accountData.number_of_employees = ctx.input.numberOfEmployees;
    if (ctx.input.annualRevenue !== undefined)
      accountData.annual_revenue = ctx.input.annualRevenue;
    if (ctx.input.industryTypeId !== undefined)
      accountData.industry_type_id = ctx.input.industryTypeId;
    if (ctx.input.businessTypeId !== undefined)
      accountData.business_type_id = ctx.input.businessTypeId;
    if (ctx.input.ownerId !== undefined) accountData.owner_id = ctx.input.ownerId;
    if (ctx.input.territoryId !== undefined) accountData.territory_id = ctx.input.territoryId;
    if (ctx.input.parentSalesAccountId !== undefined)
      accountData.parent_sales_account_id = ctx.input.parentSalesAccountId;
    if (ctx.input.customFields) accountData.custom_field = ctx.input.customFields;

    let account: Record<string, any>;
    let action: string;

    if (ctx.input.accountId) {
      account = await client.updateAccount(ctx.input.accountId, accountData);
      action = 'updated';
    } else if (ctx.input.uniqueIdentifier) {
      account = await client.upsertAccount(ctx.input.uniqueIdentifier, accountData);
      action = 'upserted';
    } else {
      account = await client.createAccount(accountData);
      action = 'created';
    }

    return {
      output: {
        accountId: account.id,
        name: account.name,
        website: account.website,
        phone: account.phone,
        city: account.city,
        country: account.country,
        createdAt: account.created_at,
        updatedAt: account.updated_at
      },
      message: `Account **${account.name || account.id}** ${action} successfully.`
    };
  })
  .build();
