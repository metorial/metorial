import { createApiServiceError, SlateTool } from 'slates';
import type { z as Zod } from 'zod';
import { z } from 'zod';
import { Client } from '../lib/client';
import { assertQrReferenceSafe, prepareQrDownload } from '../lib/files';
import type { qrParametersSchema } from '../lib/schemas';
import { spec } from '../spec';

export let generateQrCode = SlateTool.create(spec, {
  name: 'Generate QR Code',
  key: 'generate_qr_code',
  description: `Generate a QR code image for text, URLs, email addresses, phone numbers, or other data. Returns a download URL for the generated image. Supports customization options like size, format, colors, and dot styles (some options require a paid plan).`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      content: z
        .string()
        .describe('The data to encode in the QR code (text, URL, email, phone number, etc.)'),
      contentType: z
        .enum(['text', 'url', 'email', 'phone', 'sms', 'geo', 'wifi', 'vcard'])
        .optional()
        .describe('Type of data being encoded (paid plans only)'),
      imageFormat: z
        .enum(['png', 'jpeg', 'webp', 'svg'])
        .optional()
        .describe('Output image format (paid plans only)'),
      size: z
        .number()
        .optional()
        .describe('Image dimensions in pixels, 50-2048 (paid plans only)'),
      margin: z.number().optional().describe('Border width in pixels, 0-100'),
      foregroundColor: z
        .string()
        .optional()
        .describe('Foreground hex color (e.g. "#000000", paid plans only)'),
      backgroundColor: z
        .string()
        .optional()
        .describe('Background hex color (e.g. "#ffffff", paid plans only)')
    })
  )
  .output(
    z.object({
      qrCodeId: z.string().describe('Unique identifier for the generated QR code'),
      downloadUrl: z.string().describe('URL to download the QR code image'),
      imageFormat: z.string().describe('Format of the generated image'),
      contentType: z.string().describe('Type of data encoded'),
      size: z.number().describe('Image dimensions in pixels'),
      margin: z.number().describe('Border width in pixels'),
      expiresAt: z
        .number()
        .describe('Unix timestamp in milliseconds when the download URL expires')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.size !== undefined &&
      (!Number.isInteger(ctx.input.size) || ctx.input.size < 50 || ctx.input.size > 2048)
    ) {
      throw createApiServiceError(
        'QR code size must be a whole number from 50 to 2048 pixels.'
      );
    }
    if (
      ctx.input.margin !== undefined &&
      (!Number.isInteger(ctx.input.margin) || ctx.input.margin < 0 || ctx.input.margin > 100)
    ) {
      throw createApiServiceError(
        'QR code margin must be a whole number from 0 to 100 pixels.'
      );
    }
    let client = new Client({ token: ctx.auth.token });

    let params: Zod.infer<typeof qrParametersSchema> = {
      value: ctx.input.content
    };
    if (ctx.input.contentType) params.type = ctx.input.contentType;
    if (ctx.input.imageFormat) params.format = ctx.input.imageFormat;
    if (ctx.input.size !== undefined) params.size = ctx.input.size;
    if (ctx.input.margin != null) params.margin = ctx.input.margin;
    if (ctx.input.foregroundColor) params.color = ctx.input.foregroundColor;
    if (ctx.input.backgroundColor) params.backgroundColor = ctx.input.backgroundColor;

    assertQrReferenceSafe(params, ctx.auth.token);
    let result = await client.generateQrCode(params);

    let data = result.data;
    await ctx.addAttachment(prepareQrDownload(data, params));
    let output = {
      qrCodeId: data.id,
      downloadUrl: data.downloadURL,
      imageFormat: data.format,
      contentType: data.type,
      size: data.size,
      margin: data.margin,
      expiresAt: data.expires
    };

    return {
      output: client.sanitize(output),
      message: client.sanitize(
        `QR code generated as a downloadable ${data.format.toUpperCase()} image.`
      )
    };
  })
  .build();
