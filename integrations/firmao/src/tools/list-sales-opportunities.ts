import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listSalesOpportunities = SlateTool.create(spec, {
  name: 'List Sales Opportunities',
  key: 'list_sales_opportunities',
  description: `Search and list sales opportunities from Firmao's sales pipeline. Supports filtering by customer, status, and pagination.`,
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
      customerId: z.number().optional().describe('Filter by customer ID'),
      status: z.string().optional().describe('Filter by status (OPEN, CLOSED)')
    })
  )
  .output(
    z.object({
      salesOpportunities: z.array(
        z.object({
          salesOpportunityId: z.number(),
          label: z.string().optional(),
          customerId: z.number().optional(),
          customerName: z.string().optional(),
          salesOpportunityValue: z.number().optional(),
          currency: z.string().optional(),
          stage: z.string().optional(),
          status: z.string().optional(),
          salesDate: z.string().optional(),
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
    if (ctx.input.customerId !== undefined)
      filters['customer(eq)'] = String(ctx.input.customerId);
    if (ctx.input.status) filters['status(eq)'] = ctx.input.status;

    let result = await client.list('salesopportunities', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let salesOpportunities = result.data.map((o: any) => ({
      salesOpportunityId: o.id,
      label: o.label ?? undefined,
      customerId: (typeof o.customer === 'object' ? o.customer?.id : o.customer) ?? undefined,
      customerName:
        (typeof o.customer === 'object'
          ? (o.customer?.name ?? o.customer?.label)
          : undefined) ?? undefined,
      salesOpportunityValue: o.salesOpportunityValue ?? undefined,
      currency: o.currency ?? undefined,
      stage: (typeof o.stage === 'object' ? o.stage?.key : o.stage) ?? undefined,
      status: o.status ?? undefined,
      salesDate: o.salesDate ?? undefined,
      creationDate: o.creationDate ?? undefined
    }));

    return {
      output: { salesOpportunities, totalSize: result.totalSize },
      message: `Found **${salesOpportunities.length}** sales opportunity(ies) (total: ${result.totalSize}).`
    };
  })
  .build();
