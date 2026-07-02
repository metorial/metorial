import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let companyPropertySchema = z
  .record(z.string(), z.any())
  .describe(
    'Company properties as key-value pairs (e.g., name, domain, industry, phone, city, state, country)'
  );

let companyOutputSchema = z.object({
  companyId: z.string().describe('HubSpot company ID'),
  properties: z.record(z.string(), z.any()).describe('Company properties'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp'),
  archived: z.boolean().optional().describe('Whether the company is archived')
});

export let createCompany = SlateTool.create(spec, {
  name: 'Create Company',
  key: 'create_company',
  description: `Create a new company in HubSpot CRM. Provide company properties such as name, domain, industry, and any custom properties.`,
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.createCompany)
  .input(
    z.object({
      properties: companyPropertySchema,
      associations: z
        .array(
          z.object({
            to: z.object({ id: z.string().describe('ID of the object to associate with') }),
            types: z.array(
              z.object({
                associationCategory: z.string().describe('Association category'),
                associationTypeId: z.number().describe('Association type ID')
              })
            )
          })
        )
        .optional()
        .describe('Associations to create with the company')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.createObject(
      'companies',
      ctx.input.properties,
      ctx.input.associations
    );

    return {
      output: {
        companyId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Created company **${result.properties.name || ''}** (ID: ${result.id})`
    };
  })
  .build();

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve a company from HubSpot CRM by ID. Optionally specify which properties and associations to include.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getCompany)
  .input(
    z.object({
      companyId: z.string().describe('HubSpot company ID'),
      properties: z.array(z.string()).optional().describe('Specific properties to return'),
      associations: z
        .array(z.string())
        .optional()
        .describe('Associated object types to include (e.g., contacts, deals)')
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getObject(
      'companies',
      ctx.input.companyId,
      ctx.input.properties,
      ctx.input.associations
    );

    return {
      output: {
        companyId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Retrieved company **${result.properties.name || ''}** (ID: ${result.id})`
    };
  })
  .build();

export let updateCompany = SlateTool.create(spec, {
  name: 'Update Company',
  key: 'update_company',
  description: `Update an existing company's properties in HubSpot CRM. Only the provided properties will be updated.`,
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.updateCompany)
  .input(
    z.object({
      companyId: z.string().describe('HubSpot company ID to update'),
      properties: companyPropertySchema
    })
  )
  .output(companyOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.updateObject(
      'companies',
      ctx.input.companyId,
      ctx.input.properties
    );

    return {
      output: {
        companyId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Updated company (ID: ${result.id})`
    };
  })
  .build();

export let deleteCompany = SlateTool.create(spec, {
  name: 'Delete Company',
  key: 'delete_company',
  description: `Archive (soft delete) a company in HubSpot CRM. The company can be restored later.`,
  tags: { destructive: true, readOnly: false }
})
  .scopes(hubSpotActionScopes.deleteCompany)
  .input(
    z.object({
      companyId: z.string().describe('HubSpot company ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    await client.deleteObject('companies', ctx.input.companyId);

    return {
      output: { success: true },
      message: `Archived company (ID: ${ctx.input.companyId})`
    };
  })
  .build();

export let listCompanies = SlateTool.create(spec, {
  name: 'List Companies',
  key: 'list_companies',
  description: `List companies from HubSpot CRM with pagination support.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.listCompanies)
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of companies to return (max 100)'),
      after: z.string().optional().describe('Pagination cursor for the next page'),
      properties: z.array(z.string()).optional().describe('Specific properties to return')
    })
  )
  .output(
    z.object({
      companies: z.array(companyOutputSchema).describe('List of companies'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      total: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.listObjects(
      'companies',
      ctx.input.limit || 10,
      ctx.input.after,
      ctx.input.properties
    );

    let companies = (result.results || []).map((r: any) => ({
      companyId: r.id,
      properties: r.properties,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      archived: r.archived
    }));

    return {
      output: {
        companies,
        hasMore: !!result.paging?.next?.after,
        nextCursor: result.paging?.next?.after,
        total: result.total
      },
      message: `Retrieved **${companies.length}** companies${result.paging?.next?.after ? ' (more available)' : ''}`
    };
  })
  .build();
