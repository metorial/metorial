import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listShipments = SlateTool.create(spec, {
  name: 'List Shipments',
  key: 'list_shipments',
  description: `Search and list shipments with filtering options including status, tags, date ranges, and batch ID. Results are paginated.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      shipmentStatus: z
        .enum(['pending', 'processing', 'label_purchased', 'cancelled'])
        .optional()
        .describe('Filter by shipment status'),
      batchId: z.string().optional().describe('Filter by batch ID'),
      tag: z.string().optional().describe('Filter by tag name'),
      createdAtStart: z
        .string()
        .optional()
        .describe('Filter by creation date start (ISO 8601)'),
      createdAtEnd: z.string().optional().describe('Filter by creation date end (ISO 8601)'),
      modifiedAtStart: z
        .string()
        .optional()
        .describe('Filter by modification date start (ISO 8601)'),
      modifiedAtEnd: z
        .string()
        .optional()
        .describe('Filter by modification date end (ISO 8601)'),
      salesOrderId: z.string().optional().describe('Filter by sales order ID'),
      page: z.number().optional().describe('Page number (default 1)'),
      pageSize: z.number().optional().describe('Results per page (default 25, max 500)'),
      sortBy: z
        .enum(['ship_date', 'created_at', 'modified_at'])
        .optional()
        .describe('Sort field'),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching shipments'),
      page: z.number().describe('Current page'),
      pages: z.number().describe('Total pages'),
      shipments: z.array(
        z.object({
          shipmentId: z.string().describe('Shipment ID'),
          carrierId: z.string().describe('Carrier ID'),
          serviceCode: z.string().describe('Service code'),
          externalShipmentId: z.string().optional().describe('External reference ID'),
          shipDate: z.string().describe('Ship date'),
          createdAt: z.string().describe('Creation timestamp'),
          shipmentStatus: z.string().describe('Shipment status'),
          tags: z.array(z.string()).describe('Tags')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let result = await client.listShipments({
      shipment_status: ctx.input.shipmentStatus,
      batch_id: ctx.input.batchId,
      tag: ctx.input.tag,
      created_at_start: ctx.input.createdAtStart,
      created_at_end: ctx.input.createdAtEnd,
      modified_at_start: ctx.input.modifiedAtStart,
      modified_at_end: ctx.input.modifiedAtEnd,
      sales_order_id: ctx.input.salesOrderId,
      page: ctx.input.page,
      page_size: ctx.input.pageSize,
      sort_by: ctx.input.sortBy,
      sort_dir: ctx.input.sortDir
    });

    let shipments = (result.shipments || []).map((s: any) => ({
      shipmentId: s.shipment_id,
      carrierId: s.carrier_id ?? '',
      serviceCode: s.service_code ?? '',
      externalShipmentId: s.external_shipment_id,
      shipDate: s.ship_date,
      createdAt: s.created_at,
      shipmentStatus: s.shipment_status,
      tags: (s.tags || []).map((t: any) => t.name)
    }));

    return {
      output: {
        total: result.total,
        page: result.page,
        pages: result.pages,
        shipments
      },
      message: `Found **${result.total}** shipment(s), showing page ${result.page} of ${result.pages}.`
    };
  })
  .build();
