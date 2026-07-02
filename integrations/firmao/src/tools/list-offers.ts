import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listOffers = SlateTool.create(spec, {
  name: 'List Offers and Orders',
  key: 'list_offers',
  description: `Search and list offers and orders from Firmao. Supports filtering by type, status, customer, and mode. Returns document summaries with pricing and status information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.number().optional().describe('Offset for pagination'),
      limit: z.number().optional().describe('Maximum results to return'),
      sort: z.string().optional().describe('Field to sort by'),
      dir: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      type: z.enum(['OFFER', 'ORDER']).optional().describe('Filter by document type'),
      offerStatus: z
        .string()
        .optional()
        .describe(
          'Filter by status (NEW, SENT, DURING_NEGOTIATIONS, ACCEPTED, REJECTED, EXECUTED)'
        ),
      customerId: z.number().optional().describe('Filter by customer ID'),
      mode: z.enum(['SALE', 'PURCHASE']).optional().describe('Filter by mode')
    })
  )
  .output(
    z.object({
      offers: z.array(
        z.object({
          offerId: z.number(),
          number: z.string().optional(),
          type: z.string().optional(),
          mode: z.string().optional(),
          offerDate: z.string().optional(),
          offerStatus: z.string().optional(),
          currency: z.string().optional(),
          netTotal: z.number().optional(),
          grossTotal: z.number().optional(),
          customerId: z.number().optional(),
          customerName: z.string().optional(),
          creationDate: z.string().optional()
        })
      ),
      totalSize: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirmaoClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let filters: Record<string, string> = {};
    if (ctx.input.type) filters['type(eq)'] = ctx.input.type;
    if (ctx.input.offerStatus) filters['offerStatus(eq)'] = ctx.input.offerStatus;
    if (ctx.input.customerId !== undefined)
      filters['customer(eq)'] = String(ctx.input.customerId);
    if (ctx.input.mode) filters['mode(eq)'] = ctx.input.mode;

    let result = await client.list('offers', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let offers = result.data.map((o: any) => ({
      offerId: o.id,
      number: o.number,
      type: o.type,
      mode: o.mode,
      offerDate: o.offerDate,
      offerStatus: o.offerStatus,
      currency: o.currency,
      netTotal: o.nettoPrice,
      grossTotal: o.bruttoPrice,
      customerId: typeof o.customer === 'object' ? o.customer?.id : o.customer,
      customerName: typeof o.customer === 'object' ? o.customer?.name : undefined,
      creationDate: o.creationDate
    }));

    return {
      output: { offers, totalSize: result.totalSize },
      message: `Found **${offers.length}** offer/order(s) (total: ${result.totalSize}).`
    };
  })
  .build();
