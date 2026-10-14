import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type { BatchStatusResult } from './client';

export let getBatchDownload = (result: BatchStatusResult) => {
  let parsed = z.url().safeParse(result.downloadFile);
  if (!parsed.success) {
    throw createApiServiceError(
      'Emailable has no downloadable file for this batch. Check its status; large-batch files are retained for 5 days.',
      { reason: 'emailable_batch_file_unavailable' }
    );
  }
  let url = new URL(parsed.data);
  let signedAt = url.searchParams.get('X-Amz-Date');
  let duration = Number(url.searchParams.get('X-Amz-Expires'));
  let refreshTime = Date.now() + 5 * 60 * 1000;
  if (signedAt && /^\d{8}T\d{6}Z$/.test(signedAt) && duration > 0) {
    let timestamp = Date.parse(
      `${signedAt.slice(0, 4)}-${signedAt.slice(4, 6)}-${signedAt.slice(6, 8)}T${signedAt.slice(9, 11)}:${signedAt.slice(11, 13)}:${signedAt.slice(13, 15)}Z`
    );
    let candidate = new Date(timestamp + duration * 1000 - 60 * 1000).getTime();
    if (Number.isFinite(candidate)) refreshTime = candidate;
  }
  return {
    url: parsed.data,
    refreshReference: { batchId: result.batchId },
    refreshAt: new Date(refreshTime).toISOString()
  };
};
