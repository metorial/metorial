import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { parseResponse } from './http';

export let exportReferenceSchema = z.object({
  tablePath: z.string(),
  filters: z.record(z.string(), z.string()).optional()
});

export let exportDownloadUrl = (file: { status: string; link?: string | null }) => {
  if (file.status !== 'fresh') {
    throw createApiServiceError(
      `The Nasdaq export is not ready (status: ${file.status}). Retry the export after generation completes.`
    );
  }
  let link = parseResponse(z.url(), file.link, 'export download URL');
  let url = new URL(link);
  if (url.protocol !== 'https:' || url.username || url.password) {
    throw createApiServiceError('Nasdaq returned an invalid export download URL.');
  }
  return link;
};

// The renewal schedule is deliberately immediate when a signed URL does not
// expose its expiry; this schedules a fresh export link at download time and
// does not assert a provider lifetime.
export let exportRefreshAt = (link: string) => {
  let url = new URL(link);
  let expires: number | undefined;
  let date = url.searchParams.get('X-Amz-Date');
  let duration = url.searchParams.get('X-Amz-Expires');
  if (date && /^\d{8}T\d{6}Z$/.test(date) && duration && /^\d+$/.test(duration)) {
    let iso = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(9, 11)}:${date.slice(11, 13)}:${date.slice(13, 15)}Z`;
    expires = Date.parse(iso) + Number(duration) * 1000;
  } else {
    let epoch = url.searchParams.get('Expires');
    if (epoch && /^\d+$/.test(epoch)) expires = Number(epoch) * 1000;
  }
  let now = Date.now();
  return new Date(
    expires !== undefined && Number.isFinite(new Date(expires).getTime())
      ? Math.max(now, expires - 60_000)
      : now
  ).toISOString();
};
