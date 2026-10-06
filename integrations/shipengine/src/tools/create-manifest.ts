import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { addDocument } from '../lib/files';
import { spec } from '../spec';

const manifestOutput = z.object({
  manifestId: z.string().optional().describe('Manifest ID when generated'),
  formId: z.string().optional().describe('Form ID'),
  carrierId: z.string().optional().describe('Carrier ID'),
  shipDate: z.string().optional().describe('Ship date'),
  shipments: z.number().optional().describe('Number of shipments included'),
  manifestDownloadUrl: z
    .string()
    .optional()
    .describe('Provider URL for the manifest document'),
  createdAt: z.string().optional().describe('Creation timestamp')
});
export let createManifest = SlateTool.create(spec, {
  name: 'Create Manifest',
  key: 'create_manifest',
  description:
    'Create carrier manifests or scan forms for existing labels. Explicit label IDs can produce multiple documents. Otherwise carrierId, warehouseId and shipDate are required. Carrier submission can be irreversible.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      carrierId: z
        .string()
        .optional()
        .describe('Carrier ID required when labelIds is omitted'),
      warehouseId: z
        .string()
        .optional()
        .describe('Warehouse ID required when labelIds is omitted'),
      shipDate: z
        .string()
        .optional()
        .describe('ISO ship date required when labelIds is omitted'),
      labelIds: z
        .array(z.string())
        .min(1)
        .optional()
        .describe(
          'Exact labels to include; exclusive with carrier/date criteria and excludedLabelIds'
        ),
      excludedLabelIds: z
        .array(z.string())
        .optional()
        .describe('Labels to exclude when using carrier, warehouse and date criteria')
    })
  )
  .output(
    manifestOutput.extend({
      manifests: z.array(manifestOutput).describe('Every generated manifest'),
      manifestRequests: z
        .array(z.object({ requestId: z.string(), status: z.string() }))
        .describe('Pending or completed carrier manifest requests'),
      hasErrors: z.boolean().describe('Whether any labels failed manifest creation')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.labelIds && ctx.input.excludedLabelIds)
      throw createApiServiceError('Choose labelIds or excludedLabelIds, not both.');
    if (
      ctx.input.labelIds &&
      (ctx.input.carrierId || ctx.input.warehouseId || ctx.input.shipDate)
    )
      throw createApiServiceError(
        'Use explicit labelIds without carrier, warehouse or date criteria.'
      );
    if (
      !ctx.input.labelIds &&
      (!ctx.input.carrierId || !ctx.input.warehouseId || !ctx.input.shipDate)
    )
      throw createApiServiceError('Provide labelIds, or carrierId, warehouseId and shipDate.');
    if (ctx.input.shipDate && !Number.isFinite(Date.parse(ctx.input.shipDate)))
      throw createApiServiceError('Provide a valid ISO ship date.');
    const client = createClient(ctx);
    const result = await client.createManifest(
      ctx.input.labelIds
        ? { label_ids: ctx.input.labelIds }
        : {
            carrier_id: ctx.input.carrierId,
            warehouse_id: ctx.input.warehouseId,
            ship_date: ctx.input.shipDate,
            excluded_label_ids: ctx.input.excludedLabelIds
          }
    );
    const receipt = {
      manifestIds: [
        ...new Set([
          ...(result.manifests ?? []).map(m => m.manifest_id),
          ...(result.manifest_id ? [result.manifest_id] : [])
        ])
      ],
      manifestRequestIds: (result.manifest_requests ?? []).map(r => r.manifest_request_id)
    };
    const incomplete = (message: string) => {
      const error = createApiServiceError(message);
      Object.assign(error.data, { writeMayHaveOccurred: true, ...receipt });
      return error;
    };
    let native: NonNullable<typeof result.manifests>;
    try {
      native =
        result.manifests ??
        (result.manifest_id ? [await client.getManifest(result.manifest_id)] : []);
    } catch {
      throw incomplete(
        'The manifest request returned an ID, but its state could not be retrieved. Check the existing manifest and request IDs before submitting again.'
      );
    }
    if (
      native.some(
        m =>
          (ctx.input.labelIds && m.label_ids?.some(id => !ctx.input.labelIds?.includes(id))) ||
          (!ctx.input.labelIds &&
            (m.carrier_id !== ctx.input.carrierId ||
              (m.warehouse_id !== undefined && m.warehouse_id !== ctx.input.warehouseId)))
      )
    )
      throw incomplete(
        'The manifest response identifies different labels or criteria. Check the returned manifest and request IDs before submitting again.'
      );
    const manifests = native.map(m => ({
      manifestId: m.manifest_id,
      formId: m.form_id,
      carrierId: m.carrier_id,
      shipDate: m.ship_date,
      shipments: m.shipments,
      manifestDownloadUrl: m.manifest_download?.href,
      createdAt: m.created_at
    }));
    const manifestRequests = (result.manifest_requests ?? []).map(r => ({
      requestId: r.manifest_request_id,
      status: r.status
    }));
    if (!manifests.length && !manifestRequests.length)
      throw incomplete(
        'Manifest creation is not confirmed. Check existing manifests before submitting the labels again.'
      );
    try {
      for (const m of native)
        if (m.manifest_download?.href)
          await addDocument(
            ctx,
            m.manifest_download.href,
            m.manifest_id,
            'pdf',
            ctx.auth.token
          );
    } catch {
      throw incomplete(
        'The manifest request succeeded, but a document could not be prepared. Retrieve existing manifests before creating another request.'
      );
    }
    return {
      output: {
        ...manifests[0],
        manifests,
        manifestRequests,
        hasErrors: Boolean(result.errors?.length)
      },
      message: `Generated ${manifests.length} manifest(s); ${manifestRequests.length} carrier request(s).${result.errors?.length ? ' Some labels reported errors; review the existing manifests before retrying.' : ''}`
    };
  })
  .build();
