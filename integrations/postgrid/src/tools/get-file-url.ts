import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { PrintMailClient } from '../lib/client';
import { spec } from '../spec';

let referenceSchema = z.object({
  orderId: z.string().min(1),
  orderType: z.enum(['letter', 'postcard', 'cheque', 'self_mailer'])
});

export let getPreviewRefreshAt = (url: string) => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw createApiServiceError('PostGrid returned an invalid PDF preview URL.');
  }
  let expires = parsed.searchParams.get('Expires');
  let expiresAt = expires && /^\d+$/.test(expires) ? Number(expires) * 1000 : Number.NaN;
  let amzDate = parsed.searchParams.get('X-Amz-Date');
  let amzExpires = parsed.searchParams.get('X-Amz-Expires');
  if (!Number.isFinite(expiresAt) && amzDate && amzExpires && /^\d+$/.test(amzExpires)) {
    let date = amzDate.replace(
      /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
      '$1-$2-$3T$4:$5:$6Z'
    );
    expiresAt = Date.parse(date) + Number(amzExpires) * 1000;
  }
  // Refresh a minute before a signed URL expires. Unspecified expiry is renewed on download.
  return new Date(
    Number.isFinite(expiresAt) ? Math.max(Date.now(), expiresAt - 60_000) : Date.now()
  ).toISOString();
};

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let parsed = referenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success) {
    throw createApiServiceError(
      'The mail order preview reference is invalid. Retrieve the order again.'
    );
  }
  let client = new PrintMailClient(ctx.auth.token);
  let order = await client.getOrder(parsed.data.orderId, parsed.data.orderType);
  if (typeof order.url !== 'string' || !order.url) {
    throw createApiServiceError(
      'The PDF preview is not available yet. Retrieve the order again after rendering completes.'
    );
  }
  return { url: order.url, expiresAt: getPreviewRefreshAt(order.url) };
});
