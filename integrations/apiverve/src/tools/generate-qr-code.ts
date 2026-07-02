import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      expiresAt: z.number().describe('Unix timestamp when the download URL expires')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params: Record<string, any> = {
      value: ctx.input.content
    };
    if (ctx.input.contentType) params.type = ctx.input.contentType;
    if (ctx.input.imageFormat) params.format = ctx.input.imageFormat;
    if (ctx.input.size) params.size = ctx.input.size;
    if (ctx.input.margin != null) params.margin = ctx.input.margin;
    if (ctx.input.foregroundColor) params.color = ctx.input.foregroundColor;
    if (ctx.input.backgroundColor) params.backgroundColor = ctx.input.backgroundColor;

    let result = await client.generateQrCode(params as any);

    if (result.status === 'error' || !result.data) {
      throw new Error(result.error || 'QR code generation failed');
    }

    let data = result.data;
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
      output,
      message: `QR code generated successfully. [Download ${data.format.toUpperCase()} image](${data.downloadURL}).`
    };
  })
  .build();
