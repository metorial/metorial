import { createApiServiceError, getFileUrlTool } from 'slates';
import { downloadDetails, downloadReferenceSchema } from '../lib/downloads';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const parsed = downloadReferenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success)
    throw createApiServiceError('The download reference is invalid. Request the file again.');
  const reference = parsed.data;
  const client = createClient({ auth: ctx.auth, config: ctx.config, input: reference });
  let download: unknown;
  if (reference.kind === 'source' && reference.projectId && reference.fileId) {
    download = await client.downloadFile(reference.projectId, reference.fileId);
  } else if (reference.kind === 'build' && reference.projectId && reference.buildId) {
    download = await client.downloadBuild(reference.projectId, reference.buildId);
  } else if (reference.kind === 'tm' && reference.tmId && reference.exportId) {
    download = await client.downloadTMExport(reference.tmId, reference.exportId);
  } else if (reference.kind === 'glossary' && reference.glossaryId && reference.exportId) {
    download = await client.downloadGlossaryExport(reference.glossaryId, reference.exportId);
  } else
    throw createApiServiceError(
      'The download reference is incomplete. Request the file again.'
    );
  const file = downloadDetails(download);
  return { url: file.url, expiresAt: file.refreshAt, headers: {}, query: {} };
});
