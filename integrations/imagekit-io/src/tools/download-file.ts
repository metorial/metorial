import { getFileUrlTool, SlateTool } from 'slates';
import { z } from 'zod';
import { downloadDetails, downloadReference } from '../lib/download';
import { invalid } from '../lib/validation';
import { spec } from '../spec';

export const downloadFile = SlateTool.create(spec, {
  name: 'Download File',
  key: 'download_file',
  description:
    'Download the original bytes of a published ImageKit file or an existing file version. Private assets use a short-lived signed download link.',
  constraints: [
    'Downloading consumes delivery bandwidth. Unpublished files cannot be delivered through the CDN.',
    'Current-file links can follow later overwrites until expiry. An exact historical version requires its provider-returned version-specific URL; renewal refuses changed resource bindings.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      fileId: z.string().describe('Current file ID from get_file or list_files'),
      versionId: z
        .string()
        .optional()
        .describe('Version ID from manage_file_versions; omit for the current version')
    })
  )
  .output(
    z.object({
      fileId: z.string(),
      versionId: z.string().describe('Native version observed while preparing the download'),
      fileName: z.string(),
      filePath: z.string(),
      mimeType: z.string().optional(),
      size: z.number(),
      expiresAt: z.string()
    })
  )
  .handleInvocation(async ctx => {
    const d = await downloadDetails(
      ctx.auth.token,
      ctx.input.fileId,
      ctx.input.versionId,
      ctx.config.urlEndpoint
    );
    await ctx.addAttachment({
      type: 'url',
      url: d.url,
      mimeType: d.file.mime,
      filename: d.file.name,
      refreshReference: d.reference,
      refreshAt: new Date(Date.parse(d.expiresAt) - 30000).toISOString()
    });
    return {
      output: {
        fileId: ctx.input.fileId,
        versionId: d.file.versionInfo!.id,
        fileName: d.file.name,
        filePath: d.file.filePath,
        mimeType: d.file.mime,
        size: d.file.size,
        expiresAt: d.expiresAt
      },
      message: `Prepared **${d.file.name}** for download.`
    };
  })
  .build();

export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const reference = downloadReference.safeParse(ctx.input.reference);
  if (!reference.success)
    throw invalid('The download reference is invalid. Request the file again.');
  const r = reference.data;
  const d = await downloadDetails(
    ctx.auth.token,
    r.fileId,
    r.versionId,
    ctx.config.urlEndpoint,
    r
  );
  return { url: d.url, expiresAt: d.expiresAt, headers: {}, query: {} };
});
