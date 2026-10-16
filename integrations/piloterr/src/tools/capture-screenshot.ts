import { createApiServiceError, getResponseHeaderValue, SlateTool } from 'slates';
import { z } from 'zod';
import { PiloterrClient } from '../lib/client';
import { spec } from '../spec';

export let captureScreenshot = SlateTool.create(spec, {
  key: 'capture_screenshot',
  name: 'Capture Screenshot File',
  description:
    'Capture a webpage as a downloadable PNG, JPEG, WebP, or PDF. Costs 2 credits per successful capture.',
  instructions: [
    'A capture is generated once. If file preparation fails after capture, inspect the delivery warning before making another paid request.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z.string().describe('Full URL of the webpage to capture'),
      format: z.enum(['png', 'jpeg', 'jpg', 'webp', 'pdf']).default('png'),
      fullPage: z
        .boolean()
        .optional()
        .describe('Capture the full page instead of the viewport'),
      viewportWidth: z
        .number()
        .optional()
        .describe('Viewport width in pixels; provider default 1280'),
      viewportHeight: z
        .number()
        .optional()
        .describe('Viewport height in pixels; provider default 1024'),
      scaleFactor: z.number().optional().describe('Pixel scale factor; provider default 1'),
      imageQuality: z
        .string()
        .optional()
        .describe('JPEG or WebP quality; provider default 80'),
      selector: z.string().optional().describe('CSS selector of the element to capture'),
      delay: z.number().min(0).max(10).optional().describe('Seconds to wait before capture'),
      waitForSelector: z.string().optional(),
      waitUntil: z
        .array(z.enum(['domcontentloaded', 'load', 'networkidle0', 'networkidle2']))
        .optional(),
      removeAds: z.boolean().optional(),
      removeCookieBanners: z.boolean().optional(),
      removeSelectors: z.string().optional().describe('Comma-separated CSS selectors to hide')
    })
  )
  .output(
    z.object({
      status: z.literal('completed').describe('The provider completed the capture request'),
      fileName: z.string(),
      mimeType: z.string(),
      sizeBytes: z.number().optional(),
      filePreparation: z
        .enum(['prepared', 'failed'])
        .describe('Whether valid screenshot file bytes were prepared for download'),
      deliveryWarning: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new PiloterrClient(ctx.auth.token);
    let response = await client.captureScreenshot({
      url: ctx.input.url,
      format: ctx.input.format,
      full_page: ctx.input.fullPage,
      viewport_width: ctx.input.viewportWidth,
      viewport_height: ctx.input.viewportHeight,
      scale_factor: ctx.input.scaleFactor,
      image_quality: ctx.input.imageQuality,
      selector: ctx.input.selector,
      delay: ctx.input.delay,
      wait_for_selector: ctx.input.waitForSelector,
      wait_until: ctx.input.waitUntil,
      remove_ads: ctx.input.removeAds,
      remove_cookie_banners: ctx.input.removeCookieBanners,
      remove_selectors: ctx.input.removeSelectors
    });
    let format = ctx.input.format === 'jpg' ? 'jpeg' : ctx.input.format;
    let mimeType = format === 'pdf' ? 'application/pdf' : `image/${format}`;
    let fileName = `webpage.${ctx.input.format}`;
    let sizeBytes: number | undefined;
    try {
      let bytes = Buffer.from(response.data);
      let declared = getResponseHeaderValue(response.headers, 'content-type')
        ?.split(';')[0]
        ?.trim()
        .toLowerCase();
      let signature =
        format === 'png'
          ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : format === 'jpeg'
            ? bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            : format === 'pdf'
              ? bytes.subarray(0, 5).toString() === '%PDF-'
              : bytes.length >= 12 &&
                bytes.subarray(0, 4).toString() === 'RIFF' &&
                bytes.subarray(8, 12).toString() === 'WEBP';
      if (declared !== mimeType || !signature)
        throw createApiServiceError(
          'The capture response did not contain the requested file type.'
        );
      sizeBytes = bytes.length;
      await ctx.addAttachment({
        type: 'content',
        content: new Response(new Uint8Array(bytes), {
          headers: { 'content-type': mimeType }
        }),
        mimeType,
        filename: fileName
      });
      return {
        output: {
          status: 'completed' as const,
          fileName,
          mimeType,
          sizeBytes,
          filePreparation: 'prepared' as const
        },
        message: 'The capture request completed and file bytes were prepared for download.'
      };
    } catch {
      return {
        output: {
          status: 'completed' as const,
          fileName,
          mimeType,
          sizeBytes,
          filePreparation: 'failed' as const,
          deliveryWarning:
            'The provider completed the paid capture request, but its file could not be prepared for download. Another capture request may consume additional credits.'
        },
        message:
          'The capture request completed, but file preparation failed. Review the delivery warning.'
      };
    }
  })
  .build();
