import { getFileUrlTool } from 'slates';
import { receiptFile, trustedReceiptUrl } from '../lib/receipts';
import { spec } from '../spec';
export const getFileUrl = getFileUrlTool(spec, async ctx => {
  trustedReceiptUrl(ctx.input.url);
  const file = await receiptFile(ctx.auth.token, ctx.input.reference);
  return { url: file.url, expiresAt: file.expiresAt, headers: {}, query: {} };
});
