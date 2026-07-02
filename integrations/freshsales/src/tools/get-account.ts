import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account',
  key: 'get_account',
  description: `Retrieve a single account (company) by ID from Freshsales. Optionally include related contacts, deals, tasks, and more.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account to retrieve'),
      include: z
        .array(
          z.enum([
            'owner',
            'creater',
            'updater',
            'territory',
            'business_type',
            'tasks',
            'appointments',
            'contacts',
            'deals',
            'industry_type',
            'child_sales_accounts'
          ])
        )
        .optional()
        .describe('Related data to include')
    })
  )
  .output(
    z.object({
      accountId: z.number(),
      name: z.string().nullable().optional(),
      address: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      zipcode: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
      numberOfEmployees: z.number().nullable().optional(),
      annualRevenue: z.number().nullable().optional(),
      industryTypeId: z.number().nullable().optional(),
      businessTypeId: z.number().nullable().optional(),
      ownerId: z.number().nullable().optional(),
      territoryId: z.number().nullable().optional(),
      parentSalesAccountId: z.number().nullable().optional(),
      customFields: z.record(z.string(), z.any()).nullable().optional(),
      createdAt: z.string().nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let includeStr = ctx.input.include?.join(',');
    let account = await client.getAccount(ctx.input.accountId, includeStr);

    return {
      output: {
        accountId: account.id,
        name: account.name,
        address: account.address,
        city: account.city,
        state: account.state,
        zipcode: account.zipcode,
        country: account.country,
        phone: account.phone,
        website: account.website,
        numberOfEmployees: account.number_of_employees,
        annualRevenue: account.annual_revenue,
        industryTypeId: account.industry_type_id,
        businessTypeId: account.business_type_id,
        ownerId: account.owner_id,
        territoryId: account.territory_id,
        parentSalesAccountId: account.parent_sales_account_id,
        customFields: account.custom_field,
        createdAt: account.created_at,
        updatedAt: account.updated_at
      },
      message: `Retrieved account **${account.name || account.id}**.`
    };
  })
  .build();
