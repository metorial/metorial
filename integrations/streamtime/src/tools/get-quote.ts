import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let getQuote = SlateTool.create(spec, {
  name: 'Get Quote',
  key: 'get_quote',
  description: `Retrieve a quote by its ID, including all details. Optionally also fetches quote line items and tracked line items.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      quoteId: z.number().describe('ID of the quote to retrieve'),
      includeLineItems: z.boolean().optional().describe('Also fetch the quote line items'),
      includeTrackedLineItems: z
        .boolean()
        .optional()
        .describe('Also fetch the tracked line items')
    })
  )
  .output(
    z.object({
      quoteId: z.number().describe('ID of the quote'),
      raw: z.record(z.string(), z.any()).describe('Full quote object'),
      lineItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Quote line items if requested'),
      trackedLineItems: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Tracked line items if requested')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });

    let quote = await client.getQuote(ctx.input.quoteId);

    let output: Record<string, any> = {
      quoteId: quote.id,
      raw: quote
    };

    if (ctx.input.includeLineItems) {
      output.lineItems = await client.listQuoteLineItems(ctx.input.quoteId);
    }
    if (ctx.input.includeTrackedLineItems) {
      output.trackedLineItems = await client.listQuoteTrackedLineItems(ctx.input.quoteId);
    }

    return {
      output: output as any,
      message: `Retrieved quote (ID: ${quote.id}).`
    };
  })
  .build();
