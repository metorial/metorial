import { createApiServiceError, getFileUrlTool } from 'slates';
import { TablesClient } from '../lib/client';
import { exportDownloadUrl, exportReferenceSchema, exportRefreshAt } from '../lib/export';
import { spec } from '../spec';

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = exportReferenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError(
      'The export reference is invalid. Request the table export again.'
    );
  let client = new TablesClient({ apiKey: ctx.auth.token, authMethod: ctx.auth.authMethod });
  let result = await client.requestBulkExport(
    reference.data.tablePath,
    reference.data.filters
  );
  let url = exportDownloadUrl(result.datatable_bulk_download.file);
  return { url, expiresAt: exportRefreshAt(url) };
});
