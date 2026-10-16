import { createApiServiceError } from 'slates';
import { z } from 'zod';

export const downloadReferenceSchema = z.object({
  kind: z.enum(['source', 'build', 'tm', 'glossary']),
  projectId: z.number().optional(),
  fileId: z.number().optional(),
  buildId: z.number().optional(),
  tmId: z.number().optional(),
  glossaryId: z.number().optional(),
  exportId: z.string().optional()
});
export type DownloadReference = z.infer<typeof downloadReferenceSchema>;

export const downloadDetails = (value: unknown) => {
  const parsed = z.object({ url: z.string().url(), expireIn: z.string() }).safeParse(value);
  if (!parsed.success)
    throw createApiServiceError(
      'Crowdin did not return a valid download URL and expiration. Request the download again.'
    );
  const expiry = Date.parse(parsed.data.expireIn);
  if (!Number.isFinite(expiry) || expiry <= Date.now())
    throw createApiServiceError(
      'The Crowdin download URL has expired or has an invalid expiration. Request the download again.'
    );
  const url = new URL(parsed.data.url);
  if (url.protocol !== 'https:' || url.username || url.password)
    throw createApiServiceError('Crowdin returned an invalid download URL.');
  // Renew before the documented signed URL expires, never using token expiry.
  const refreshAt = new Date(
    expiry - Math.min(60000, (expiry - Date.now()) / 2)
  ).toISOString();
  return { url: parsed.data.url, expiresAt: parsed.data.expireIn, refreshAt };
};

export const attachDownload = async (
  ctx: {
    addAttachment: (attachment: {
      type: 'url';
      url: string;
      refreshAt: string;
      refreshReference: DownloadReference;
    }) => Promise<unknown>;
  },
  value: unknown,
  reference: DownloadReference
) => {
  const file = downloadDetails(value);
  await ctx.addAttachment({
    type: 'url',
    url: file.url,
    refreshAt: file.refreshAt,
    refreshReference: reference
  });
  return file;
};
