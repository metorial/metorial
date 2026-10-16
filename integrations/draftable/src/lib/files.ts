import { createApiServiceError } from 'slates';
import { type ExportResponse, validateHttpUrl } from './client';

// Draftable documents signed URLs without a fixed TTL. Re-resolve the export on
// every subsequent download instead of inventing a provider expiry duration.
export let renewAt = () => new Date().toISOString();

export let exportFileUrl = (result: ExportResponse) => {
  if (!result.ready || result.failed || !result.url) {
    throw createApiServiceError(
      'The export is not available for download. Check get_export_status for its processing state.'
    );
  }
  return validateHttpUrl(result.url, 'Export download URL');
};

type FileContext = {
  addAttachment: (file: {
    type: 'url';
    url: string;
    mimeType: string;
    refreshReference: { exportIdentifier: string };
    refreshAt: string;
  }) => Promise<unknown>;
};

export let attachExport = async (ctx: FileContext, result: ExportResponse) => {
  if (!result.ready || result.failed) return;
  await ctx.addAttachment({
    type: 'url',
    url: exportFileUrl(result),
    mimeType: 'application/pdf',
    refreshReference: { exportIdentifier: result.identifier },
    refreshAt: renewAt()
  });
};
