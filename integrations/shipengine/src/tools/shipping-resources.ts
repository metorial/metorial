import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { addDocument, type DocumentFormat } from '../lib/files';
import { spec } from '../spec';

const resourceKinds = [
  'label',
  'shipment',
  'warehouse',
  'pickup',
  'manifest',
  'manifest_request'
] as const;
export const getShippingResource = SlateTool.create(spec, {
  name: 'Get Shipping Resource',
  key: 'get_shipping_resource',
  description:
    'Retrieve one existing label, shipment, warehouse, pickup, manifest or manifest request by its exact provider ID. Includes the state needed to recover purchases and confirm cancellation.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: z.enum(resourceKinds).describe('Type of existing provider resource'),
      resourceId: z.string().describe('Exact ID from a previous result')
    })
  )
  .output(
    z.object({
      resourceType: z.enum(resourceKinds),
      resource: z
        .record(z.string(), z.unknown())
        .describe(
          'Validated native provider metadata, with exact IDs and original monetary units'
        )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const resource =
      ctx.input.resourceType === 'label'
        ? await client.getLabel(ctx.input.resourceId)
        : ctx.input.resourceType === 'shipment'
          ? await client.getShipment(ctx.input.resourceId)
          : ctx.input.resourceType === 'warehouse'
            ? await client.getWarehouse(ctx.input.resourceId)
            : ctx.input.resourceType === 'pickup'
              ? await client.getPickup(ctx.input.resourceId)
              : ctx.input.resourceType === 'manifest'
                ? await client.getManifest(ctx.input.resourceId)
                : await client.getManifestRequest(ctx.input.resourceId);
    return {
      output: { resourceType: ctx.input.resourceType, resource },
      message: `Retrieved ${ctx.input.resourceType} **${ctx.input.resourceId}**.`
    };
  })
  .build();
export const listShippingResources = SlateTool.create(spec, {
  name: 'List Shipping Resources',
  key: 'list_shipping_resources',
  description:
    'List one page of existing pickups or manifests for recovery and operational history. Cancelled pickups remain in history.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: z.enum(['pickups', 'manifests']),
      carrierId: z.string().optional(),
      warehouseId: z.string().optional(),
      createdAtStart: z.string().optional().describe('ISO lower creation boundary'),
      createdAtEnd: z.string().optional().describe('ISO upper creation boundary'),
      shipDateStart: z.string().optional().describe('Manifest ship date lower boundary'),
      shipDateEnd: z.string().optional().describe('Manifest ship date upper boundary'),
      page: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
      pageSize: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional()
    })
  )
  .output(
    z.object({
      resourceType: z.enum(['pickups', 'manifests']),
      resources: z.array(z.record(z.string(), z.unknown())),
      total: z.number(),
      page: z.number(),
      pages: z.number()
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.resourceType === 'pickups' &&
      (ctx.input.shipDateStart || ctx.input.shipDateEnd)
    )
      throw createApiServiceError('Ship date filters are available only for manifests.');
    const client = createClient(ctx);
    const params = {
      carrier_id: ctx.input.carrierId,
      warehouse_id: ctx.input.warehouseId,
      created_at_start: ctx.input.createdAtStart,
      created_at_end: ctx.input.createdAtEnd,
      page: ctx.input.page,
      page_size: ctx.input.pageSize
    };
    const result =
      ctx.input.resourceType === 'pickups'
        ? await client.listPickups(params)
        : await client.listManifests({
            ...params,
            ship_date_start: ctx.input.shipDateStart,
            ship_date_end: ctx.input.shipDateEnd
          });
    const resources = 'pickups' in result ? result.pickups : result.manifests;
    return {
      output: {
        resourceType: ctx.input.resourceType,
        resources,
        total: result.total,
        page: result.page,
        pages: result.pages
      },
      message: `Retrieved page ${result.page} of ${result.pages} ${ctx.input.resourceType}.`
    };
  })
  .build();
export const downloadShippingDocument = SlateTool.create(spec, {
  name: 'Download Shipping Document',
  key: 'download_shipping_document',
  description:
    'Download an existing label or manifest without purchasing another label or submitting another manifest. Files can be unavailable after provider retention expires.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: z.enum(['label', 'manifest']),
      resourceId: z.string(),
      format: z
        .enum(['pdf', 'png', 'zpl'])
        .optional()
        .describe('Label format. Manifests use PDF.')
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      files: z.array(
        z.object({ filename: z.string(), mimeType: z.string(), size: z.number() })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    if (
      ctx.input.resourceType === 'manifest' &&
      ctx.input.format &&
      ctx.input.format !== 'pdf'
    )
      throw createApiServiceError('Manifest documents use PDF format.');
    let urls: string[];
    let format: DocumentFormat;
    if (ctx.input.resourceType === 'manifest') {
      const manifest = await client.getManifest(ctx.input.resourceId);
      format = 'pdf';
      urls = manifest.manifest_download?.href ? [manifest.manifest_download.href] : [];
    } else {
      const label = await client.getLabel(ctx.input.resourceId);
      const selected = ctx.input.format ?? label.label_format ?? 'pdf';
      if (!['pdf', 'png', 'zpl'].includes(selected))
        throw createApiServiceError('Choose PDF, PNG or ZPL.');
      format = selected as DocumentFormat;
      const downloads = [
        label.label_download,
        ...(label.packages ?? []).map(p => p.label_download)
      ];
      urls = downloads
        .map(d => d?.[format] ?? (label.label_format === format ? d?.href : undefined))
        .filter((url): url is string => Boolean(url));
    }
    if (!urls.length)
      throw createApiServiceError(
        'No document in the requested format is available. Check resource status and provider retention.'
      );
    const files: Awaited<ReturnType<typeof addDocument>>[] = [];
    for (const [index, url] of [...new Set(urls)].entries())
      files.push(
        await addDocument(
          ctx,
          url,
          `${ctx.input.resourceId}-${index + 1}`,
          format,
          ctx.input.resourceType === 'manifest' ? ctx.auth.token : undefined
        )
      );
    return {
      output: { resourceId: ctx.input.resourceId, files },
      message: `Prepared the existing ${ctx.input.resourceType} document(s) for download.`
    };
  })
  .build();
