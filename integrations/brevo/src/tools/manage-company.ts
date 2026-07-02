import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { brevoServiceError } from '../lib/errors';
import { spec } from '../spec';

let companyOutputSchema = z.object({
  companyId: z.string().describe('Company ID'),
  attributes: z.record(z.string(), z.any()).optional().describe('Company attributes'),
  linkedContactIds: z.array(z.number()).optional().describe('Linked contact IDs'),
  linkedDealIds: z.array(z.string()).optional().describe('Linked deal IDs')
});

let mapCompany = (company: any) => ({
  companyId: company.id,
  attributes: company.attributes,
  linkedContactIds: company.linkedContactsIds,
  linkedDealIds: company.linkedDealsIds
});

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company in the Brevo CRM. Optionally set attributes and link contacts or deals.`,
  instructions: [
    'Use attributes.name for the company display name if you need it available in list results.',
    'If you pass a phone_number attribute, countryCode can help Brevo normalize the phone number.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Company name'),
      attributes: z.record(z.string(), z.any()).optional().describe('Company attributes'),
      countryCode: z
        .number()
        .optional()
        .describe('Country code used when phone_number is passed in attributes'),
      linkedContactIds: z.array(z.number()).optional().describe('Contact IDs to link'),
      linkedDealIds: z.array(z.string()).optional().describe('Deal IDs to link')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('ID of the newly created company')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.createCompany({
      name: ctx.input.name,
      attributes: ctx.input.attributes,
      countryCode: ctx.input.countryCode,
      linkedContactsIds: ctx.input.linkedContactIds,
      linkedDealsIds: ctx.input.linkedDealIds
    });

    return {
      output: result,
      message: `Company **${ctx.input.name}** created. Company ID: **${result.companyId}**`
    };
  });

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve details of a Brevo CRM company, including attributes and linked contacts or deals.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to retrieve')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let company = await client.getCompany(ctx.input.companyId);

    return {
      output: mapCompany(company),
      message: `Retrieved company **${company.attributes?.name || company.id}**.`
    };
  });

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update a Brevo CRM company's name, attributes, or linked contacts and deals.
Updating linkedContactIds or linkedDealIds replaces the entire association list.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to update'),
      name: z.string().optional().describe('New company name'),
      attributes: z.record(z.string(), z.any()).optional().describe('Attributes to update'),
      linkedContactIds: z
        .array(z.number())
        .optional()
        .describe('Full list of contact IDs to link'),
      linkedDealIds: z.array(z.string()).optional().describe('Full list of deal IDs to link')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    if (
      !ctx.input.name &&
      !ctx.input.attributes &&
      !ctx.input.linkedContactIds &&
      !ctx.input.linkedDealIds
    ) {
      throw brevoServiceError(
        'Provide at least one of name, attributes, linkedContactIds, or linkedDealIds.'
      );
    }

    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.updateCompany(ctx.input.companyId, {
      name: ctx.input.name,
      attributes: ctx.input.attributes,
      linkedContactsIds: ctx.input.linkedContactIds,
      linkedDealsIds: ctx.input.linkedDealIds
    });

    return {
      output: { success: true },
      message: `Company **${ctx.input.companyId}** updated successfully.`
    };
  });

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Permanently delete a Brevo CRM company. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      companyId: z.string().describe('ID of the company to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion completed successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteCompany(ctx.input.companyId);

    return {
      output: { success: true },
      message: `Company **${ctx.input.companyId}** deleted permanently.`
    };
  });

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `Retrieve Brevo CRM companies with optional filtering by name, linked contact, linked deal, creation date, or modification date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of companies per page'),
      page: z.number().optional().describe('Page index'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      sortBy: z.string().optional().describe('Attribute used for sorting'),
      modifiedSince: z
        .string()
        .optional()
        .describe('Filter companies modified after this UTC date-time'),
      createdSince: z
        .string()
        .optional()
        .describe('Filter companies created after this UTC date-time'),
      name: z.string().optional().describe('Filter by company name'),
      linkedContactId: z.number().optional().describe('Filter by linked contact ID'),
      linkedDealId: z.string().optional().describe('Filter by linked deal ID')
    })
  )
  .output(
    z.object({
      companies: z.array(companyOutputSchema).describe('List of companies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.listCompanies({
      limit: ctx.input.limit,
      page: ctx.input.page,
      sort: ctx.input.sort,
      sortBy: ctx.input.sortBy,
      modifiedSince: ctx.input.modifiedSince,
      createdSince: ctx.input.createdSince,
      name: ctx.input.name,
      linkedContactId: ctx.input.linkedContactId,
      linkedDealId: ctx.input.linkedDealId
    });

    let companies = (result.items ?? []).map(mapCompany);

    return {
      output: { companies },
      message: `Retrieved **${companies.length}** companies.`
    };
  });
