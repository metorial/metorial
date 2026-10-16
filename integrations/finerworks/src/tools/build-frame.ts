import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, requireInteger } from '../lib/client';
import { spec } from '../spec';

let recordSchema = z.record(z.string(), z.unknown());

export let buildFrame = SlateTool.create(spec, {
  key: 'build_frame',
  name: 'Build Frame Preview',
  description:
    'Validate and price a FinerWorks frame package using a product code, with an optional downloadable PNG or JPEG preview. Use browse_framing to discover compatible frame, mat and glazing choices.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      productCode: z
        .string()
        .min(1)
        .describe(
          'Frame package product code, including size, matting and glazing selections'
        ),
      generatePreview: z
        .boolean()
        .default(false)
        .describe('Generate a downloadable preview; rendering takes additional time'),
      format: z.enum(['png', 'jpg']).default('png'),
      renderSize: z
        .number()
        .min(100)
        .max(1200)
        .default(500)
        .describe('Maximum rendered image dimension in pixels'),
      squared: z.boolean().optional(),
      shadowInner: z.boolean().optional(),
      imageUrl: z
        .string()
        .optional()
        .describe('Optional JPG or PNG image URL to display within the frame')
    })
  )
  .output(
    z.object({
      frame: recordSchema.optional(),
      mats: z.array(recordSchema).optional(),
      glazing: recordSchema.optional(),
      totalPrice: z.number().optional(),
      previewFilename: z.string().optional(),
      raw: recordSchema.optional()
    })
  )
  .handleInvocation(async ctx => {
    requireInteger(ctx.input.renderSize, 'Render size', 100, 1200);
    let data = await new Client(ctx.auth).frameBuilder(
      ctx.input.productCode,
      ctx.input.generatePreview
        ? {
            content_type: ctx.input.format === 'png' ? 0 : 1,
            render_size: ctx.input.renderSize,
            squared: ctx.input.squared,
            shadow_inner: ctx.input.shadowInner,
            frame_image_to_display_url: ctx.input.imageUrl
          }
        : undefined
    );
    let { base64data, ...metadata } = data;
    let previewFilename: string | undefined;
    if (ctx.input.generatePreview) {
      if (typeof base64data !== 'string' || !base64data.trim()) {
        throw createApiServiceError(
          'FinerWorks did not return a frame preview. Request the preview again.'
        );
      }
      let encoded = base64data
        .replace(/^data:image\/(?:png|jpeg);base64,/, '')
        .replace(/\s/g, '');
      if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded) || encoded.length % 4 !== 0) {
        throw createApiServiceError('FinerWorks returned an invalid encoded frame preview.');
      }
      let bytes = Buffer.from(encoded, 'base64');
      let isPng = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      let isJpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!isPng && !isJpeg)
        throw createApiServiceError(
          'FinerWorks returned a preview that is not a PNG or JPEG image.'
        );
      let mimeType = isPng ? 'image/png' : 'image/jpeg';
      previewFilename = `frame-preview.${isPng ? 'png' : 'jpg'}`;
      await ctx.addAttachment({
        type: 'content',
        filename: previewFilename,
        mimeType,
        content: new Response(new Uint8Array(bytes), { headers: { 'content-type': mimeType } })
      });
    }
    return {
      output: {
        frame: data.frame ?? undefined,
        mats: data.mats ?? undefined,
        glazing: data.glazing ?? undefined,
        totalPrice: data.total_price ?? undefined,
        previewFilename,
        raw: metadata
      },
      message: ctx.input.generatePreview
        ? 'Frame package priced and preview prepared for download.'
        : 'Frame package validated and priced.'
    };
  })
  .build();
