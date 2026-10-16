import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { CincopaClient } from '../lib/client';
import { requireSuccess } from '../lib/response';
import { spec } from '../spec';

export let importMedia = SlateTool.create(spec, {
  key: 'import_media',
  name: 'Import Media',
  description:
    'Start a media import using Cincopa’s documented URL-upload API, or abort an existing import.',
  instructions: [
    'Use upload_media with check_status and the returned statusId to track an import.'
  ]
})
  .input(
    z.object({
      action: z.enum(['start', 'abort']),
      sourceUrl: z
        .string()
        .optional()
        .describe('Public media URL; required to start an import'),
      galleryId: z.string().optional().describe('Gallery fid to receive the asset'),
      targetAssetId: z.string().optional().describe('Asset rid to attach the import to'),
      assetType: z.string().optional().describe('Attachment type, such as thumb'),
      statusId: z.string().optional().describe('Existing import status ID; required to abort')
    })
  )
  .output(z.object({ success: z.boolean(), statusId: z.string().optional() }))
  .handleInvocation(async ctx => {
    let client = new CincopaClient(ctx.auth);
    let data: { success?: boolean; status_id?: string };
    if (ctx.input.action === 'start') {
      if (!ctx.input.sourceUrl)
        throw createApiServiceError('sourceUrl is required to start an import.');
      data = await client.importMedia({
        input: ctx.input.sourceUrl,
        fid: ctx.input.galleryId,
        rid: ctx.input.targetAssetId,
        type: ctx.input.assetType
      });
    } else {
      if (!ctx.input.statusId)
        throw createApiServiceError('statusId is required to abort an import.');
      data = await client.abortImport(ctx.input.statusId);
    }
    return {
      output: { success: requireSuccess(data), statusId: data.status_id },
      message:
        ctx.input.action === 'start'
          ? 'Started the media import.'
          : 'Aborted the media import.'
    };
  })
  .build();
