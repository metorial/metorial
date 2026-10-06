import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { parseResponse } from '../lib/schemas';
import { spec } from '../spec';

export const downloadDetails = async (client: Client, fileId: string) => {
  const url = parseResponse(
    z.string().url(),
    await client.getFileDownloadLink(fileId),
    'file download link'
  );
  // The provider does not document a URL lifetime. Renew on each download instead of guessing.
  return { url, expiresAt: new Date().toISOString() };
};
const referenceSchema = z.object({ fileId: z.string().min(1) });
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError('The file reference is invalid. Request the file again.');
  return downloadDetails(new Client(ctx.auth), reference.data.fileId);
});
