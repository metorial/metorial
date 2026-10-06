import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { FilesClient } from '../lib/client';
import { spec } from '../spec';

// Unknown signed URL formats are renewed on every download rather than guessing their lifetime.
export const fileUrlExpiry = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw createApiServiceError('Botpress returned an invalid file download URL.');
  }
  const date = url.searchParams.get('X-Amz-Date');
  const seconds = Number(url.searchParams.get('X-Amz-Expires'));
  if (date && /^\d{8}T\d{6}Z$/.test(date) && Number.isFinite(seconds) && seconds > 0) {
    const timestamp = Date.parse(
      `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${date.slice(9, 11)}:${date.slice(11, 13)}:${date.slice(13, 15)}Z`
    );
    const expiry = timestamp + seconds * 1000 - 30000;
    if (Number.isFinite(expiry) && Math.abs(expiry) <= 8640000000000000)
      return new Date(expiry).toISOString();
  }
  return new Date().toISOString();
};
const referenceSchema = z.object({ botId: z.string().min(1), fileId: z.string().min(1) });
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError('The file reference is invalid. Request the file again.');
  const { file } = await new FilesClient({
    token: ctx.auth.token,
    botId: reference.data.botId
  }).getFile(reference.data.fileId);
  if (!file.url) throw createApiServiceError('Botpress did not return a file download URL.');
  return { url: file.url, expiresAt: fileUrlExpiry(file.url) };
});
