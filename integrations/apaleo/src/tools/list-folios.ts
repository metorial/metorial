import { SlateTool } from 'slates';
import { z } from 'zod';
import { ApaleoClient } from '../lib/client';
import { spec } from '../spec';

export let listFolios = SlateTool.create(spec, {
  name: 'List Folios',
  key: 'list_folios',
  description: `List guest folios filtered by property, reservation, or booking. Returns balance, charges, and payment summaries. Use this to find a guest's folio before posting charges or creating invoices.`,
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      propertyId: z.string().optional().describe('Property ID'),
      reservationIds: z.array(z.string()).optional().describe('Filter by reservation IDs'),
      bookingId: z.string().optional().describe('Filter by booking ID'),
      onlyMain: z.boolean().optional().describe('Return only the main folio per reservation'),
      type: z.string().optional().describe('Folio type filter (e.g., Guest, External)'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      folios: z
        .array(
          z
            .object({
              folioId: z.string().describe('Folio ID'),
              type: z.string().optional().describe('Folio type (Guest, External, etc.)'),
              reservationId: z.string().optional(),
              bookingId: z.string().optional(),
              property: z
                .object({
                  propertyId: z.string().optional(),
                  name: z.string().optional()
                })
                .optional(),
              balance: z
                .object({
                  amount: z.number().optional(),
                  currency: z.string().optional()
                })
                .optional(),
              status: z.string().optional().describe('Folio status (Open, Closed)'),
              created: z.string().optional(),
              modified: z.string().optional()
            })
            .passthrough()
        )
        .describe('List of folios'),
      count: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ApaleoClient(ctx.auth.token);

    let result = await client.listFolios({
      propertyId: ctx.input.propertyId || ctx.config.propertyId,
      reservationIds: ctx.input.reservationIds,
      bookingId: ctx.input.bookingId,
      onlyMain: ctx.input.onlyMain,
      type: ctx.input.type,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let folios = (result.folios || []).map((f: any) => ({
      folioId: f.id,
      type: f.type,
      reservationId: f.reservation?.id,
      bookingId: f.booking?.id,
      property: f.property ? { propertyId: f.property.id, name: f.property.name } : undefined,
      balance: f.balance,
      status: f.status,
      created: f.created,
      modified: f.modified
    }));

    return {
      output: {
        folios,
        count: result.count || folios.length
      },
      message: `Found **${result.count || folios.length}** folios.`
    };
  })
  .build();
