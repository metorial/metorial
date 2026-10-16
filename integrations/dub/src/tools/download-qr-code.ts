import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let downloadQrCode = SlateTool.create(spec, {
  name: 'Download QR Code',
  key: 'download_qr_code',
  description:
    'Generate a downloadable PNG or SVG QR code for a URL, including a Dub short link. Customize the size, colors, margin, and error correction.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      url: z
        .string()
        .url()
        .max(32000)
        .describe('URL encoded in the QR code; use a Dub short link to track scans'),
      format: z.enum(['png', 'svg']).optional().describe('Image format, defaults to PNG'),
      size: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Image size in pixels, defaults to 600'),
      level: z
        .enum(['L', 'M', 'Q', 'H'])
        .optional()
        .describe('Error correction level, defaults to L'),
      foregroundColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .describe('Foreground color such as #000000'),
      backgroundColor: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional()
        .describe('Background color such as #ffffff; omitted SVG background is transparent'),
      margin: z
        .number()
        .nonnegative()
        .optional()
        .describe('Margin around the QR code, defaults to 2')
    })
  )
  .output(z.object({ fileName: z.string(), mimeType: z.string(), encodedUrl: z.string() }))
  .handleInvocation(async ctx => {
    let format = ctx.input.format ?? 'png';
    let url = new URL('https://api.dub.co/qr');
    url.searchParams.set('url', ctx.input.url);
    url.searchParams.set('format', format);
    for (let [key, value] of Object.entries({
      size: ctx.input.size,
      level: ctx.input.level,
      fgColor: ctx.input.foregroundColor,
      bgColor: ctx.input.backgroundColor,
      margin: ctx.input.margin
    })) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    let mimeType = format === 'svg' ? 'image/svg+xml' : 'image/png';
    await ctx.addAttachment({ type: 'url', url, mimeType });
    return {
      output: { fileName: `qr-code.${format}`, mimeType, encodedUrl: ctx.input.url },
      message: `Prepared a **${format.toUpperCase()}** QR code for download`
    };
  })
  .build();
