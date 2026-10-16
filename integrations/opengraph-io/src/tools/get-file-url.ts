import { createApiServiceError, getFileUrlTool } from 'slates';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { screenshotInputSchema } from './capture-screenshot';

export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = screenshotInputSchema.safeParse(ctx.input.reference);
  if (!reference.success) {
    throw createApiServiceError(
      'The screenshot reference is invalid. Capture the screenshot again.'
    );
  }
  let { url, ...options } = reference.data;
  let client = new Client(ctx.auth);
  let result = await client.captureScreenshot(url, { ...options, cacheOk: false });
  return {
    url: result.screenshotUrl,
    expiresAt: new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString()
  };
});
