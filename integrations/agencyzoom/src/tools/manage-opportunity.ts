import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageOpportunity = SlateTool.create(spec, {
  name: 'Manage Opportunity',
  key: 'manage_opportunity',
  description: `Create, update, or delete a standalone opportunity in AgencyZoom. Set carrier, product line, premium, items, and property address details for an insurance opportunity.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Action to perform on the opportunity'),
      opportunityId: z
        .string()
        .optional()
        .describe('ID of the opportunity (required for "update" and "delete" actions)'),
      carrier: z.string().optional().describe('Carrier name or ID for the opportunity'),
      productLine: z
        .string()
        .optional()
        .describe('Product line name or ID (e.g. "Auto", "Home")'),
      premium: z.number().optional().describe('Premium amount in cents'),
      items: z.number().optional().describe('Number of items or units'),
      propertyAddress: z
        .object({
          street: z.string().optional().describe('Street address'),
          city: z.string().optional().describe('City name'),
          state: z.string().optional().describe('State abbreviation (e.g. "CA", "NY")'),
          zip: z.string().optional().describe('ZIP or postal code')
        })
        .optional()
        .describe('Property address details for the opportunity')
    })
  )
  .output(
    z.object({
      opportunity: z
        .record(z.string(), z.any())
        .optional()
        .describe('Opportunity data (for "create" and "update" actions)'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the operation succeeded (for "delete" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret
    });

    switch (ctx.input.action) {
      case 'create': {
        let data: Record<string, any> = {};
        if (ctx.input.carrier !== undefined) data.carrier = ctx.input.carrier;
        if (ctx.input.productLine !== undefined) data.productLine = ctx.input.productLine;
        if (ctx.input.premium !== undefined) data.premium = ctx.input.premium;
        if (ctx.input.items !== undefined) data.items = ctx.input.items;
        if (ctx.input.propertyAddress !== undefined)
          data.propertyAddress = ctx.input.propertyAddress;

        let result = await client.createOpportunity(data);
        return {
          output: { opportunity: result },
          message: `Created opportunity${ctx.input.productLine ? ` for **${ctx.input.productLine}**` : ''}.`
        };
      }
      case 'update': {
        if (!ctx.input.opportunityId) {
          throw new Error('opportunityId is required for "update" action');
        }
        let data: Record<string, any> = {};
        if (ctx.input.carrier !== undefined) data.carrier = ctx.input.carrier;
        if (ctx.input.productLine !== undefined) data.productLine = ctx.input.productLine;
        if (ctx.input.premium !== undefined) data.premium = ctx.input.premium;
        if (ctx.input.items !== undefined) data.items = ctx.input.items;
        if (ctx.input.propertyAddress !== undefined)
          data.propertyAddress = ctx.input.propertyAddress;

        let result = await client.updateOpportunity(ctx.input.opportunityId, data);
        return {
          output: { opportunity: result },
          message: `Updated opportunity **${ctx.input.opportunityId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.opportunityId) {
          throw new Error('opportunityId is required for "delete" action');
        }
        await client.deleteOpportunity(ctx.input.opportunityId);
        return {
          output: { success: true },
          message: `Deleted opportunity **${ctx.input.opportunityId}**.`
        };
      }
    }
  })
  .build();
