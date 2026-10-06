import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShippoClient } from '../lib/client';
import { invalid } from '../lib/helpers';
import { spec } from '../spec';
export let getShippingResource = SlateTool.create(spec, {
  name: 'Get Shipping Resource',
  key: 'get_shipping_resource',
  description:
    'Retrieve an existing order, refund, manifest or batch by exact ID. Inspect asynchronous status and batch validation/purchase results before taking another action.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      kind: z.enum(['order', 'refund', 'manifest', 'batch']),
      resourceId: z.string(),
      page: z.number().optional().describe('Batch shipment page only.'),
      resultsPerPage: z.number().optional().describe('Batch page size from 1 to 100.'),
      nextPage: z
        .string()
        .optional()
        .describe('Exact batch shipment continuation; omit other pagination/filter fields.'),
      objectResults: z
        .enum([
          'creation_failed',
          'creation_succeeded',
          'purchase_failed',
          'purchase_succeeded'
        ])
        .optional()
        .describe('Batch result filter only.')
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      kind: z.enum(['order', 'refund', 'manifest', 'batch']),
      status: z.string().optional(),
      resource: z.record(z.string(), z.unknown()),
      documentCount: z.number().optional(),
      nextLink: z.string().optional(),
      hasMore: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.kind !== 'batch' &&
      [
        ctx.input.page,
        ctx.input.resultsPerPage,
        ctx.input.nextPage,
        ctx.input.objectResults
      ].some(v => v !== undefined)
    )
      throw invalid('Pagination and objectResults apply only to batches.');
    const client = new ShippoClient(ctx.auth);
    const r =
      ctx.input.kind === 'order'
        ? await client.getOrder(ctx.input.resourceId)
        : ctx.input.kind === 'refund'
          ? await client.getRefund(ctx.input.resourceId)
          : ctx.input.kind === 'manifest'
            ? await client.getManifest(ctx.input.resourceId)
            : await client.getBatch(ctx.input.resourceId, {
                page: ctx.input.page,
                results: ctx.input.resultsPerPage,
                nextPage: ctx.input.nextPage,
                object_results: ctx.input.objectResults
              });
    const { label_url, commercial_invoice_url, documents, ...resource } = r;
    return {
      output: {
        resourceId: r.object_id,
        kind: ctx.input.kind,
        status: r.status ?? r.order_status,
        resource,
        documentCount:
          ctx.input.kind === 'manifest'
            ? documents?.length
            : ctx.input.kind === 'batch' && Array.isArray(label_url)
              ? label_url.length
              : undefined,
        nextLink: r.batch_shipments?.next,
        hasMore: r.batch_shipments ? !!r.batch_shipments.next : undefined
      },
      message: `Retrieved ${ctx.input.kind} ${r.object_id}. Its current status does not imply every batch purchase succeeded.`
    };
  })
  .build();
