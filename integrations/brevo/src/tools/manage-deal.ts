import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDeal = SlateTool.create(spec, {
  name: 'Create Deal',
  key: 'create_deal',
  description: `Create a new deal in the Brevo CRM. Optionally assign it to a pipeline and stage, link contacts and companies, and set custom attributes like deal owner.`,
  instructions: [
    'To assign a pipeline and stage, pass them as attributes: attributes.deal_stage and attributes.pipeline.',
    'To set a deal owner, use attributes.deal_owner with the account email or ID.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Deal name'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom deal attributes (e.g., deal_stage, pipeline, deal_owner, amount)'),
      linkedContactIds: z
        .array(z.number())
        .optional()
        .describe('Contact IDs to link to this deal'),
      linkedCompanyIds: z
        .array(z.string())
        .optional()
        .describe('Company IDs to link to this deal')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the newly created deal')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.createDeal({
      name: ctx.input.name,
      attributes: ctx.input.attributes,
      linkedContactsIds: ctx.input.linkedContactIds,
      linkedCompaniesIds: ctx.input.linkedCompanyIds
    });

    return {
      output: result,
      message: `Deal **${ctx.input.name}** created. Deal ID: **${result.dealId}**`
    };
  });

export let getDeal = SlateTool.create(spec, {
  name: 'Get Deal',
  key: 'get_deal',
  description: `Retrieve details of a specific CRM deal, including its attributes, linked contacts, and linked companies.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dealId: z.string().describe('ID of the deal to retrieve')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('Deal ID'),
      attributes: z.record(z.string(), z.any()).optional().describe('Deal attributes'),
      linkedContactIds: z.array(z.number()).optional().describe('Linked contact IDs'),
      linkedCompanyIds: z.array(z.string()).optional().describe('Linked company IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let deal = await client.getDeal(ctx.input.dealId);

    return {
      output: {
        dealId: deal.id,
        attributes: deal.attributes,
        linkedContactIds: deal.linkedContactsIds,
        linkedCompanyIds: deal.linkedCompaniesIds
      },
      message: `Retrieved deal **${deal.attributes?.deal_name || deal.id}**.`
    };
  });

export let updateDeal = SlateTool.create(spec, {
  name: 'Update Deal',
  key: 'update_deal',
  description: `Update an existing CRM deal's name, attributes, or linked contacts and companies.
**Note:** Updating linkedContactIds or linkedCompanyIds replaces the entire list -- omitted IDs will be removed.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z.string().describe('ID of the deal to update'),
      name: z.string().optional().describe('New deal name'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Deal attributes to update'),
      linkedContactIds: z
        .array(z.number())
        .optional()
        .describe('Full list of contact IDs to link (replaces existing)'),
      linkedCompanyIds: z
        .array(z.string())
        .optional()
        .describe('Full list of company IDs to link (replaces existing)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.updateDeal(ctx.input.dealId, {
      name: ctx.input.name,
      attributes: ctx.input.attributes,
      linkedContactsIds: ctx.input.linkedContactIds,
      linkedCompaniesIds: ctx.input.linkedCompanyIds
    });

    return {
      output: { success: true },
      message: `Deal **${ctx.input.dealId}** updated successfully.`
    };
  });

export let deleteDeal = SlateTool.create(spec, {
  name: 'Delete Deal',
  key: 'delete_deal',
  description: `Permanently delete a CRM deal. This action is irreversible.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      dealId: z.string().describe('ID of the deal to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    await client.deleteDeal(ctx.input.dealId);

    return {
      output: { success: true },
      message: `Deal **${ctx.input.dealId}** deleted permanently.`
    };
  });

export let listDeals = SlateTool.create(spec, {
  name: 'List Deals',
  key: 'list_deals',
  description: `Retrieve a list of CRM deals with optional filtering by modification or creation date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Number of deals per page'),
      offset: z.number().optional().describe('Index of the first deal'),
      sort: z.enum(['asc', 'desc']).optional().describe('Sort order by creation date'),
      modifiedSince: z
        .string()
        .optional()
        .describe('Filter deals modified after this UTC date-time'),
      createdSince: z
        .string()
        .optional()
        .describe('Filter deals created after this UTC date-time')
    })
  )
  .output(
    z.object({
      deals: z
        .array(
          z.object({
            dealId: z.string().describe('Deal ID'),
            attributes: z.record(z.string(), z.any()).optional().describe('Deal attributes'),
            linkedContactIds: z.array(z.number()).optional().describe('Linked contact IDs'),
            linkedCompanyIds: z.array(z.string()).optional().describe('Linked company IDs')
          })
        )
        .describe('List of deals')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let result = await client.listDeals({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      modifiedSince: ctx.input.modifiedSince,
      createdSince: ctx.input.createdSince
    });

    let items = result.items ?? result ?? [];
    let deals = (Array.isArray(items) ? items : []).map((d: any) => ({
      dealId: d.id,
      attributes: d.attributes,
      linkedContactIds: d.linkedContactsIds,
      linkedCompanyIds: d.linkedCompaniesIds
    }));

    return {
      output: { deals },
      message: `Retrieved **${deals.length}** deals.`
    };
  });
