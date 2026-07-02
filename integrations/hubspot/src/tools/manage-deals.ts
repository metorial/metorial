import { SlateTool } from 'slates';
import { z } from 'zod';
import { HubSpotClient } from '../lib/client';
import { hubSpotActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let dealPropertySchema = z
  .record(z.string(), z.any())
  .describe(
    'Deal properties as key-value pairs (e.g., dealname, amount, dealstage, pipeline, closedate, hubspot_owner_id)'
  );

let dealOutputSchema = z.object({
  dealId: z.string().describe('HubSpot deal ID'),
  properties: z.record(z.string(), z.any()).describe('Deal properties'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last updated timestamp'),
  archived: z.boolean().optional().describe('Whether the deal is archived')
});

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Create a new deal in HubSpot CRM. Provide deal properties such as dealname, amount, dealstage, pipeline, and closedate.`,
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.createDeal)
  .input(
    z.object({
      properties: dealPropertySchema,
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
        .describe('Associations to create with the deal (e.g., contacts, companies)')
    })
  )
  .output(dealOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.createObject(
      'deals',
      ctx.input.properties,
      ctx.input.associations
    );

    return {
      output: {
        dealId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Created deal **${result.properties.dealname || ''}** (ID: ${result.id})`
    };
  })
  .build();

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieve a deal from HubSpot CRM by ID. Optionally specify which properties and associations to include.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.getDeal)
  .input(
    z.object({
      dealId: z.string().describe('HubSpot deal ID'),
      properties: z.array(z.string()).optional().describe('Specific properties to return'),
      associations: z
        .array(z.string())
        .optional()
        .describe('Associated object types to include')
    })
  )
  .output(dealOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.getObject(
      'deals',
      ctx.input.dealId,
      ctx.input.properties,
      ctx.input.associations
    );

    return {
      output: {
        dealId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Retrieved deal **${result.properties.dealname || ''}** (ID: ${result.id})`
    };
  })
  .build();

export let updateDeal = SlateTool.create(spec, {
  name: 'Update Deal',
  key: 'update_deal',
  description: `Update an existing deal's properties in HubSpot CRM. Use this to change deal stage, amount, close date, or any other deal property.`,
  tags: { destructive: false, readOnly: false }
})
  .scopes(hubSpotActionScopes.updateDeal)
  .input(
    z.object({
      dealId: z.string().describe('HubSpot deal ID to update'),
      properties: dealPropertySchema
    })
  )
  .output(dealOutputSchema)
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.updateObject('deals', ctx.input.dealId, ctx.input.properties);

    return {
      output: {
        dealId: result.id,
        properties: result.properties,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        archived: result.archived
      },
      message: `Updated deal (ID: ${result.id})`
    };
  })
  .build();

export let deleteDeal = SlateTool.create(spec, {
  name: 'Delete Deal',
  key: 'delete_deal',
  description: `Archive (soft delete) a deal in HubSpot CRM.`,
  tags: { destructive: true, readOnly: false }
})
  .scopes(hubSpotActionScopes.deleteDeal)
  .input(
    z.object({
      dealId: z.string().describe('HubSpot deal ID to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    await client.deleteObject('deals', ctx.input.dealId);

    return {
      output: { success: true },
      message: `Archived deal (ID: ${ctx.input.dealId})`
    };
  })
  .build();

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `List deals from HubSpot CRM with pagination support.`,
  tags: { readOnly: true }
})
  .scopes(hubSpotActionScopes.listDeals)
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of deals to return (max 100)'),
      after: z.string().optional().describe('Pagination cursor for the next page'),
      properties: z.array(z.string()).optional().describe('Specific properties to return')
    })
  )
  .output(
    z.object({
      deals: z.array(dealOutputSchema).describe('List of deals'),
      hasMore: z.boolean().describe('Whether more results are available'),
      nextCursor: z.string().optional().describe('Cursor for fetching the next page'),
      total: z.number().optional().describe('Total number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HubSpotClient(ctx.auth.token);
    let result = await client.listObjects(
      'deals',
      ctx.input.limit || 10,
      ctx.input.after,
      ctx.input.properties
    );

    let deals = (result.results || []).map((r: any) => ({
      dealId: r.id,
      properties: r.properties,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      archived: r.archived
    }));

    return {
      output: {
        deals,
        hasMore: !!result.paging?.next?.after,
        nextCursor: result.paging?.next?.after,
        total: result.total
      },
      message: `Retrieved **${deals.length}** deals${result.paging?.next?.after ? ' (more available)' : ''}`
    };
  })
  .build();
