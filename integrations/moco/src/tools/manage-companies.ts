import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let companyOutputSchema = z.object({
  companyId: z.number().describe('Company ID'),
  name: z.string().describe('Company name'),
  type: z.string().optional().describe('Company type: customer, supplier, or organization'),
  website: z.string().optional().describe('Company website'),
  email: z.string().optional().describe('Company email'),
  phone: z.string().optional().describe('Company phone number'),
  fax: z.string().optional().describe('Company fax number'),
  address: z.string().optional().describe('Company address'),
  currency: z.string().optional().describe('Default currency'),
  identifier: z.string().optional().describe('Company identifier'),
  tags: z.array(z.string()).optional().describe('Company tags'),
  user: z.any().optional().describe('Assigned user details'),
  info: z.string().optional().describe('Additional information'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapCompany = (c: any) => ({
  companyId: c.id,
  name: c.name,
  type: c.type,
  website: c.website,
  email: c.email,
  phone: c.phone,
  fax: c.fax,
  address: c.address,
  currency: c.currency,
  identifier: c.identifier,
  tags: c.tags,
  user: c.user,
  info: c.info,
  createdAt: c.created_at,
  updatedAt: c.updated_at
});

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `Retrieve a list of companies (customers, suppliers, or organizations). Supports filtering by type, tags, and search term.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['customer', 'supplier', 'organization'])
        .optional()
        .describe('Filter by company type'),
      tags: z.string().optional().describe('Comma-separated list of tags to filter by'),
      term: z.string().optional().describe('Full-text search term'),
      identifier: z.string().optional().describe('Filter by company identifier'),
      includeArchived: z.boolean().optional().describe('Include archived companies'),
      updatedAfter: z
        .string()
        .optional()
        .describe('Filter by last updated timestamp (ISO 8601)')
    })
  )
  .output(
    z.object({
      companies: z.array(companyOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let params: Record<string, any> = {};
    if (ctx.input.type) params.type = ctx.input.type;
    if (ctx.input.tags) params.tags = ctx.input.tags;
    if (ctx.input.term) params.term = ctx.input.term;
    if (ctx.input.identifier) params.identifier = ctx.input.identifier;
    if (ctx.input.includeArchived) params.include_archived = ctx.input.includeArchived;
    if (ctx.input.updatedAfter) params.updated_after = ctx.input.updatedAfter;

    let data = await client.listCompanies(params);
    let companies = (data as any[]).map(mapCompany);

    return {
      output: { companies },
      message: `Found **${companies.length}** companies.`
    };
  })
  .build();

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve detailed information about a specific company, including contact details, type, and custom properties.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.number().describe('The ID of the company to retrieve')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    let c = await client.getCompany(ctx.input.companyId);

    return {
      output: mapCompany(c),
      message: `Retrieved company **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company in MOCO. Specify name and type (customer, supplier, or organization). Customers also require a currency.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Company name'),
      type: z.enum(['customer', 'supplier', 'organization']).describe('Company type'),
      currency: z.string().optional().describe('Currency code (required for customers)'),
      website: z.string().optional().describe('Company website URL'),
      email: z.string().optional().describe('Company email address'),
      phone: z.string().optional().describe('Company phone number'),
      address: z.string().optional().describe('Company address'),
      identifier: z.string().optional().describe('Company identifier'),
      tags: z.array(z.string()).optional().describe('Company tags'),
      info: z.string().optional().describe('Additional notes')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    let data: Record<string, any> = {
      name: ctx.input.name,
      type: ctx.input.type
    };

    if (ctx.input.currency) data.currency = ctx.input.currency;
    if (ctx.input.website) data.website = ctx.input.website;
    if (ctx.input.email) data.email = ctx.input.email;
    if (ctx.input.phone) data.phone = ctx.input.phone;
    if (ctx.input.address) data.address = ctx.input.address;
    if (ctx.input.identifier) data.identifier = ctx.input.identifier;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.info) data.info = ctx.input.info;

    let c = await client.createCompany(data);

    return {
      output: mapCompany(c),
      message: `Created company **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company's properties. Can also archive or unarchive companies by setting the action field.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      companyId: z.number().describe('The ID of the company to update'),
      action: z
        .enum(['update', 'archive', 'unarchive'])
        .optional()
        .default('update')
        .describe('Action: update fields, archive, or unarchive'),
      name: z.string().optional().describe('New company name'),
      website: z.string().optional().describe('New website URL'),
      email: z.string().optional().describe('New email address'),
      phone: z.string().optional().describe('New phone number'),
      address: z.string().optional().describe('New address'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      info: z.string().optional().describe('Updated notes')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });

    if (ctx.input.action === 'archive') {
      let c = await client.archiveCompany(ctx.input.companyId);
      return {
        output: mapCompany(c),
        message: `Archived company **${c.name}** (ID: ${c.id}).`
      };
    }

    if (ctx.input.action === 'unarchive') {
      let c = await client.unarchiveCompany(ctx.input.companyId);
      return {
        output: mapCompany(c),
        message: `Unarchived company **${c.name}** (ID: ${c.id}).`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.website !== undefined) data.website = ctx.input.website;
    if (ctx.input.email !== undefined) data.email = ctx.input.email;
    if (ctx.input.phone !== undefined) data.phone = ctx.input.phone;
    if (ctx.input.address !== undefined) data.address = ctx.input.address;
    if (ctx.input.tags) data.tags = ctx.input.tags;
    if (ctx.input.info !== undefined) data.info = ctx.input.info;

    let c = await client.updateCompany(ctx.input.companyId, data);

    return {
      output: mapCompany(c),
      message: `Updated company **${c.name}** (ID: ${c.id}).`
    };
  })
  .build();

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Permanently delete a company from MOCO.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      companyId: z.number().describe('The ID of the company to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, domain: ctx.auth.domain });
    await client.deleteCompany(ctx.input.companyId);

    return {
      output: { success: true },
      message: `Deleted company **${ctx.input.companyId}**.`
    };
  })
  .build();
