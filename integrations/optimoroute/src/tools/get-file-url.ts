import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getCompletionImageRefreshAt, getCompletionImages } from '../lib/completion-images';
import { spec } from '../spec';

let referenceSchema = z.object({
  orderNo: z.string().optional(),
  orderId: z.string().optional(),
  imagePath: z.array(z.union([z.string(), z.number()]))
});

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let parsed = referenceSchema.safeParse(ctx.input.reference);
  if (!parsed.success) {
    throw createApiServiceError(
      'The proof-of-delivery image reference is invalid. Retrieve completion details again.'
    );
  }
  let reference = parsed.data;
  let client = new Client({ token: ctx.auth.token });
  let result = await client.getCompletionDetails([
    { orderNo: reference.orderNo, id: reference.orderId }
  ]);
  let order = result.orders?.[0];
  if (!order?.success) {
    throw createApiServiceError(
      'The proof-of-delivery order is unavailable. Retrieve completion details again.',
      {
        upstreamCode: order?.code
      }
    );
  }
  let image = getCompletionImages(order.data).find(
    image =>
      JSON.stringify(image.path) === JSON.stringify(reference.imagePath) &&
      new URL(image.url).pathname === new URL(ctx.input.url).pathname
  );
  if (!image) {
    throw createApiServiceError(
      'The proof-of-delivery image is no longer available. Retrieve completion details again.'
    );
  }
  return { url: image.url, expiresAt: getCompletionImageRefreshAt(image.url) };
});
