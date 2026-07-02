import { SlateTool } from 'slates';
import { z } from 'zod';
import { FirmaoClient } from '../lib/client';
import { spec } from '../spec';

export let listWarehouseDocuments = SlateTool.create(spec, {
  name: 'List Warehouse Documents',
  key: 'list_warehouse_documents',
  description: `List warehouse/storage documents from Firmao. Includes GRN (Goods Received Notes), GIN (Goods Issue Notes), and internal transfers. Supports filtering by type and pagination.`,
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
      type: z
        .string()
        .optional()
        .describe(
          'Filter by type (OUTSIDE_INCOME, OUTSIDE_RELEASE, INSIDE_INCOME, INSIDE_RELEASE, WAREHOUSE_TRANSFER)'
        )
    })
  )
  .output(
    z.object({
      warehouseDocuments: z.array(
        z.object({
          warehouseDocumentId: z.number(),
          number: z.string().optional(),
          type: z.string().optional(),
          customerId: z.number().optional(),
          customerName: z.string().optional(),
          warehouseName: z.string().optional(),
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

    let result = await client.list('storagedocs', {
      start: ctx.input.start,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      dir: ctx.input.dir,
      filters
    });

    let warehouseDocuments = result.data.map((d: any) => ({
      warehouseDocumentId: d.id,
      number: d.number,
      type: d.type,
      customerId: typeof d.customer === 'object' ? d.customer?.id : d.customer,
      customerName: typeof d.customer === 'object' ? d.customer?.name : undefined,
      warehouseName: d.warehouse?.name,
      creationDate: d.creationDate
    }));

    return {
      output: { warehouseDocuments, totalSize: result.totalSize },
      message: `Found **${warehouseDocuments.length}** warehouse document(s) (total: ${result.totalSize}).`
    };
  })
  .build();
