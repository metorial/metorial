import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateQrCode = SlateTool.create(spec, {
  name: 'Generate QR Code',
  key: 'generate_qr_code',
  description: `Generate a QR code image for a short link. Customize color, background color, size, and output format (PNG or SVG). Provides a downloadable image and preserves the PNG data URI or SVG markup in the existing output.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      linkId: z
        .string()
        .describe('The link ID string (e.g., "lnk_abc123_abcdef") to generate a QR code for.'),
      color: z.string().optional().describe('Foreground hex color code (e.g., "000000").'),
      backgroundColor: z
        .string()
        .optional()
        .describe('Background hex color code (e.g., "FFFFFF").'),
      size: z.number().optional().describe('QR code size (1-99).'),
      format: z.enum(['png', 'svg']).optional().describe('Output format. Defaults to PNG.'),
      useDomainSettings: z
        .boolean()
        .optional()
        .describe(
          'Use saved domain QR settings. Defaults to false when custom color or size is supplied, otherwise true.'
        )
    })
  )
  .output(
    z.object({
      qrCode: z.string().describe('QR code as a base64 data URI (PNG) or SVG markup string.'),
      linkId: z.string().describe('The link ID the QR code was generated for.')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.size !== undefined && (ctx.input.size < 1 || ctx.input.size > 99)) {
      throw createApiServiceError('QR size must be between 1 and 99.');
    }
    for (let color of [ctx.input.color, ctx.input.backgroundColor]) {
      if (color !== undefined && !/^[0-9a-f]{6,8}$/i.test(color)) {
        throw createApiServiceError('QR colors must contain 6 to 8 hexadecimal characters.');
      }
    }
    let client = new Client({ token: ctx.auth.token });

    let result = await client.generateQrCode(ctx.input.linkId, {
      color: ctx.input.color,
      backgroundColor: ctx.input.backgroundColor,
      size: ctx.input.size,
      type: ctx.input.format,
      useDomainSettings: ctx.input.useDomainSettings
    });

    await ctx.addAttachment({
      type: 'content',
      content: new Response(result.content, { headers: { 'content-type': result.mimeType } }),
      mimeType: result.mimeType,
      filename: `qr-code.${result.mimeType === 'image/svg+xml' ? 'svg' : 'png'}`
    });

    return {
      output: {
        qrCode: result.qrCode,
        linkId: ctx.input.linkId
      },
      message: `Generated QR code for link **${ctx.input.linkId}**`
    };
  })
  .build();
