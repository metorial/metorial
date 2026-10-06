import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let listLabels = SlateTool.create(spec, {
  name: 'List Labels',
  key: 'list_labels',
  description: `Search and list shipping labels with filtering options including status, carrier, tracking number, and date ranges. Results are paginated.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      labelStatus: z
        .enum(['processing', 'completed', 'error', 'voided'])
        .optional()
        .describe('Filter by label status'),
      carrierId: z.string().optional().describe('Filter by carrier ID'),
      serviceCode: z.string().optional().describe('Filter by service code'),
      trackingNumber: z.string().optional().describe('Filter by tracking number'),
      batchId: z.string().optional().describe('Filter by batch ID'),
      warehouseId: z.string().optional().describe('Filter by warehouse ID'),
      createdAtStart: z
        .string()
        .optional()
        .describe('Filter by creation date start (ISO 8601)'),
      createdAtEnd: z.string().optional().describe('Filter by creation date end (ISO 8601)'),
      page: z
        .number()
        .int()
        .positive()
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .describe('Page number (default 1)'),
      pageSize: z
        .number()
        .int()
        .positive()
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .describe('Results per page (default 25)'),
      sortBy: z
        .enum(['created_at', 'ship_date', 'modified_at', 'voided_at'])
        .optional()
        .describe(
          'Sort field. Legacy ship_date is unsupported; choose created_at, modified_at or voided_at.'
        ),
      sortDir: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      total: z.number().describe('Total number of matching labels'),
      page: z.number().describe('Current page'),
      pages: z.number().describe('Total pages'),
      labels: z.array(
        z.object({
          labelId: z.string().describe('Label ID'),
          shipmentId: z.string().describe('Shipment ID'),
          trackingNumber: z.string().optional().describe('Tracking number'),
          status: z.string().describe('Label status'),
          carrierId: z.string().optional().describe('Carrier ID'),
          carrierCode: z.string().optional().describe('Carrier code'),
          serviceCode: z.string().optional().describe('Service code'),
          shipDate: z.string().optional().describe('Ship date'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          shippingCost: z.number().optional().describe('Shipping cost'),
          currency: z.string().optional().describe('Currency code'),
          trackable: z.boolean().optional().describe('Whether the shipment is trackable'),
          voided: z.boolean().optional().describe('Whether the label has been voided'),
          labelFormat: z.string().optional().describe('Label format'),
          labelDownloadUrl: z.string().optional().describe('URL to download the label')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listLabels({
      label_status: ctx.input.labelStatus,
      carrier_id: ctx.input.carrierId,
      service_code: ctx.input.serviceCode,
      tracking_number: ctx.input.trackingNumber,
      batch_id: ctx.input.batchId,
      warehouse_id: ctx.input.warehouseId,
      created_at_start: ctx.input.createdAtStart,
      created_at_end: ctx.input.createdAtEnd,
      page: ctx.input.page,
      page_size: ctx.input.pageSize,
      sort_by: ctx.input.sortBy,
      sort_dir: ctx.input.sortDir
    });

    let labels = result.labels.map(l => ({
      labelId: l.label_id,
      shipmentId: l.shipment_id,
      trackingNumber: l.tracking_number,
      status: l.status,
      carrierId: l.carrier_id,
      carrierCode: l.carrier_code,
      serviceCode: l.service_code,
      shipDate: l.ship_date,
      createdAt: l.created_at,
      shippingCost: l.shipment_cost?.amount,
      currency: l.shipment_cost?.currency,
      trackable: l.trackable,
      voided: l.voided,
      labelFormat: l.label_format,
      labelDownloadUrl: l.label_download?.href
    }));

    return {
      output: {
        total: result.total,
        page: result.page,
        pages: result.pages,
        labels
      },
      message: `Found **${result.total}** label(s), showing page ${result.page} of ${result.pages}.`
    };
  })
  .build();
