import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLeadQuote = SlateTool.create(spec, {
  name: 'Manage Lead Quote',
  key: 'manage_lead_quote',
  description: `Add, update, or delete a quote on a lead. Quotes represent insurance pricing proposals from carriers for a lead. Use "create" to add a new quote, "update" to modify an existing one, or "delete" to remove one.`,
  instructions: [
    'For "create": provide the lead ID and quote details (carrier, productLine, premium, items).',
    'For "update": provide both leadId and quoteId along with the fields to update.',
    'For "delete": provide both leadId and quoteId.'
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
        .describe('Operation to perform on the quote'),
      quoteId: z
        .string()
        .optional()
        .describe('Unique identifier of the quote (required for "update" and "delete")'),
      carrier: z.string().optional().describe('Insurance carrier name'),
      productLine: z.string().optional().describe('Product line or type of insurance'),
      premium: z.number().optional().describe('Quoted premium amount in dollars'),
      items: z.number().optional().describe('Number of policy items in the quote')
    })
  )
  .output(
    z.object({
      quote: z
        .record(z.string(), z.any())
        .optional()
        .describe('The quote data returned by AgencyZoom (for "create" and "update")'),
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

        let result = await client.addLeadQuote(ctx.input.leadId, data);
        let quoteData = result.data ?? result;

        return {
          output: { quote: quoteData },
          message: `Created quote on lead **${ctx.input.leadId}**.${ctx.input.carrier ? ` Carrier: **${ctx.input.carrier}**.` : ''}`
        };
      }
      case 'update': {
        if (!ctx.input.quoteId) {
          throw new Error('quoteId is required for "update" action');
        }

        let data: Record<string, unknown> = {};
        if (ctx.input.carrier !== undefined) data.carrier = ctx.input.carrier;
        if (ctx.input.productLine !== undefined) data.productLine = ctx.input.productLine;
        if (ctx.input.premium !== undefined) data.premium = ctx.input.premium;
        if (ctx.input.items !== undefined) data.items = ctx.input.items;

        let result = await client.updateLeadQuote(ctx.input.leadId, ctx.input.quoteId, data);
        let quoteData = result.data ?? result;

        return {
          output: { quote: quoteData },
          message: `Updated quote **${ctx.input.quoteId}** on lead **${ctx.input.leadId}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.quoteId) {
          throw new Error('quoteId is required for "delete" action');
        }

        await client.deleteLeadQuote(ctx.input.leadId, ctx.input.quoteId);

        return {
          output: { success: true },
          message: `Deleted quote **${ctx.input.quoteId}** from lead **${ctx.input.leadId}**.`
        };
      }
    }
  })
  .build();
