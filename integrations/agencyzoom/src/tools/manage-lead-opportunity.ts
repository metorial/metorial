import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLeadOpportunity = SlateTool.create(spec, {
  name: 'Manage Lead Opportunity',
  key: 'manage_lead_opportunity',
  description: `Add, update, or delete an opportunity on a lead. Opportunities track potential insurance products and premiums associated with a lead. Use "create" to add a new opportunity, "update" to modify an existing one, or "delete" to remove one.`,
  instructions: [
    'For "create": provide the lead ID and opportunity details (carrier, productLine, premium, items).',
    'For "update": provide both leadId and opportunityId along with the fields to update.',
    'For "delete": provide both leadId and opportunityId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.string().describe('Unique identifier of the lead'),
      action: z
        .enum(['create', 'update', 'delete'])
        .describe('Operation to perform on the opportunity'),
      opportunityId: z
        .string()
        .optional()
        .describe('Unique identifier of the opportunity (required for "update" and "delete")'),
      carrier: z.string().optional().describe('Insurance carrier name'),
      productLine: z.string().optional().describe('Product line or type of insurance'),
      premium: z.number().optional().describe('Premium amount in dollars'),
      items: z.number().optional().describe('Number of policy items')
    })
  )
  .output(
    z.object({
      opportunity: z
        .record(z.string(), z.any())
        .optional()
        .describe('The opportunity data returned by AgencyZoom (for "create" and "update")'),
      success: z
        .boolean()
        .optional()
        .describe('Whether the operation was successful (for "delete")')
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
        let data: Record<string, unknown> = {};
        if (ctx.input.carrier !== undefined) data.carrier = ctx.input.carrier;
        if (ctx.input.productLine !== undefined) data.productLine = ctx.input.productLine;
        if (ctx.input.premium !== undefined) data.premium = ctx.input.premium;
        if (ctx.input.items !== undefined) data.items = ctx.input.items;

        let result = await client.addLeadOpportunity(ctx.input.leadId, data);
        let opportunityData = result.data ?? result;

        return {
          output: { opportunity: opportunityData },
          message: `Created opportunity on lead **${ctx.input.leadId}**.${ctx.input.carrier ? ` Carrier: **${ctx.input.carrier}**.` : ''}`
        };
      }
      case 'update': {
        if (!ctx.input.opportunityId) {
          throw new Error('opportunityId is required for "update" action');
        }

        let data: Record<string, unknown> = {};
        if (ctx.input.carrier !== undefined) data.carrier = ctx.input.carrier;
        if (ctx.input.productLine !== undefined) data.productLine = ctx.input.productLine;
        if (ctx.input.premium !== undefined) data.premium = ctx.input.premium;
        if (ctx.input.items !== undefined) data.items = ctx.input.items;

        let result = await client.updateLeadOpportunity(
          ctx.input.leadId,
          ctx.input.opportunityId,
          data
        );
        let opportunityData = result.data ?? result;

        return {
          output: { opportunity: opportunityData },
          message: `Updated opportunity **${ctx.input.opportunityId}** on lead **${ctx.input.leadId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.opportunityId) {
          throw new Error('opportunityId is required for "delete" action');
        }

        await client.deleteLeadOpportunity(ctx.input.leadId, ctx.input.opportunityId);

        return {
          output: { success: true },
          message: `Deleted opportunity **${ctx.input.opportunityId}** from lead **${ctx.input.leadId}**.`
        };
      }
    }
  })
  .build();
