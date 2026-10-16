import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { KnackClient, object, resolveApplicationId, text } from '../lib/client';
import { spec } from '../spec';

export let getRecordFile = SlateTool.create(spec, {
  name: 'Download Record File',
  key: 'get_record_file',
  description:
    'Prepare a file or image stored in a Knack record for download. Call get_app_metadata to discover object, view, and file field keys.',
  instructions: [
    'Choose a file or image field. View access can download only fields exposed by that view.',
    'The file must already be associated with a record. Uploads must be associated with one field per asset.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      recordId: z.string().describe('Record ID containing the file'),
      fieldKey: z
        .string()
        .describe(
          'File or image field key, such as field_5; call get_app_metadata to discover it'
        ),
      objectKey: z
        .string()
        .optional()
        .describe('Object key for API Key access; call get_app_metadata to discover it'),
      sceneKey: z.string().optional().describe('Scene key for view access; requires viewKey'),
      viewKey: z
        .string()
        .optional()
        .describe('View key exposing the file field; requires sceneKey')
    })
  )
  .output(
    z.object({
      assetId: z.string().describe('File asset ID returned by Knack'),
      fileName: z.string().describe('Filename returned by Knack'),
      size: z.number().optional().describe('File size in bytes when returned by Knack'),
      assetType: z.string().optional().describe('Asset type returned by Knack')
    })
  )
  .handleInvocation(async ctx => {
    const client = new KnackClient({
      applicationId: resolveApplicationId(ctx.auth, ctx.config),
      token: ctx.auth.token,
      authMode: ctx.auth.authMode
    });
    const record =
      ctx.input.sceneKey && ctx.input.viewKey
        ? await client.getViewRecord(ctx.input.sceneKey, ctx.input.viewKey, ctx.input.recordId)
        : ctx.input.objectKey
          ? await client.getObjectRecord(ctx.input.objectKey, ctx.input.recordId)
          : undefined;
    if (!record)
      throw createApiServiceError('Provide objectKey or both sceneKey and viewKey.');
    const value = record[`${ctx.input.fieldKey}_raw`];
    if (value == null || value === '')
      throw createApiServiceError('That field has no downloadable file.');
    const file = object(value);
    const assetId = text(file.id, 'file asset ID');
    const fileName = text(file.filename, 'filename');
    let url: URL;
    try {
      url = new URL(text(file.url, 'download URL'));
    } catch {
      throw createApiServiceError('Knack returned an invalid file download URL.');
    }
    // Official file response examples use this stable, public download host.
    // No credentials are forwarded to file URLs.
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'api.knack.com' ||
      url.port ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw createApiServiceError(
        'Knack returned an unsupported file URL. Only its documented stable public download URLs are supported.'
      );
    const size =
      typeof file.size === 'number' && Number.isFinite(file.size) && file.size >= 0
        ? file.size
        : undefined;
    await ctx.addAttachment({ type: 'url', url, filename: fileName });
    return {
      output: {
        assetId,
        fileName,
        size,
        assetType: typeof file.type === 'string' ? file.type : undefined
      },
      message: `Prepared **${fileName}** for download.`
    };
  })
  .build();
