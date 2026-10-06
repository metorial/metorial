import { getFileUrlTool } from 'slates';
import { invoiceFile } from '../lib/files';
import { spec } from '../spec';
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  const file = await invoiceFile(ctx.auth.token, ctx.input.reference, ctx.input.url);
  return {
    url: file.url,
    expiresAt: file.expiresAt,
    headers: file.headers,
    query: file.query
  };
});
