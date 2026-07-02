import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listSalesNotes = SlateTool.create(spec, {
  name: 'List Sales Notes',
  key: 'list_sales_notes',
  description: `Search and list sales notes (notes, meetings, phone calls) from Firmao. Supports filtering by type, customer, and pagination.`,
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
      type: z.enum(['NOTE', 'MEETING', 'CALL']).optional().describe('Filter by note type'),
      customerId: z.number().optional().describe('Filter by customer ID')
    })
  )
  .output(
    z.object({
      salesNotes: z.array(
        z.object({
          salesNoteId: z.number(),
          description: z.string().optional(),
          type: z.string().optional(),
          customerId: z.number().optional(),
          customerName: z.string().optional(),
          date: z.string().optional(),
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
    if (ctx.input.customerId !== undefined)
      filters['customer(eq)'] = String(ctx.input.customerId);

    let result = await client.list('salesnotes', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let salesNotes = result.data.map((n: any) => ({
      salesNoteId: n.id,
      description: n.description,
      type: n.type,
      customerId: typeof n.customer === 'object' ? n.customer?.id : n.customer,
      customerName: typeof n.customer === 'object' ? n.customer?.name : undefined,
      date: n.date,
      creationDate: n.creationDate
    }));

    return {
      output: { salesNotes, totalSize: result.totalSize },
      message: `Found **${salesNotes.length}** sales note(s) (total: ${result.totalSize}).`
    };
  })
  .build();
