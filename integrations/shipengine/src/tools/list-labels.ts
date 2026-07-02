import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      page: z.number().optional().describe('Page number (default 1)'),
      pageSize: z.number().optional().describe('Results per page (default 25, max 200)'),
      sortBy: z.enum(['created_at', 'ship_date']).optional().describe('Sort field'),
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
          trackingNumber: z.string().describe('Tracking number'),
          status: z.string().describe('Label status'),
          carrierId: z.string().describe('Carrier ID'),
          carrierCode: z.string().describe('Carrier code'),
          serviceCode: z.string().describe('Service code'),
          shipDate: z.string().describe('Ship date'),
          createdAt: z.string().describe('Creation timestamp'),
          shippingCost: z.number().describe('Shipping cost'),
          currency: z.string().describe('Currency code'),
          trackable: z.boolean().describe('Whether the shipment is trackable'),
          voided: z.boolean().describe('Whether the label has been voided'),
          labelFormat: z.string().describe('Label format'),
          labelDownloadUrl: z.string().describe('URL to download the label')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

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

    let labels = (result.labels || []).map((l: any) => ({
      labelId: l.label_id,
      shipmentId: l.shipment_id,
      trackingNumber: l.tracking_number,
      status: l.status,
      carrierId: l.carrier_id,
      carrierCode: l.carrier_code,
      serviceCode: l.service_code,
      shipDate: l.ship_date,
      createdAt: l.created_at,
      shippingCost: l.shipment_cost?.amount ?? 0,
      currency: l.shipment_cost?.currency ?? 'usd',
      trackable: l.trackable,
      voided: l.voided,
      labelFormat: l.label_format,
      labelDownloadUrl: l.label_download?.href ?? ''
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
