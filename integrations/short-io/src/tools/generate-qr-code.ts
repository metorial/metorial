import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateQrCode = SlateTool.create(spec, {
  name: 'Generate QR Code',
  key: 'generate_qr_code',
  description: `Generate a QR code image for a short link. Customize color, background color, size, and output format (PNG or SVG). Returns a base64-encoded data URI for PNG or raw SVG markup.`,
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
      format: z.enum(['png', 'svg']).optional().describe('Output format. Defaults to PNG.')
    })
  )
  .output(
    z.object({
      qrCode: z.string().describe('QR code as a base64 data URI (PNG) or SVG markup string.'),
      linkId: z.string().describe('The link ID the QR code was generated for.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let qrCode = await client.generateQrCode(ctx.input.linkId, {
      color: ctx.input.color,
      backgroundColor: ctx.input.backgroundColor,
      size: ctx.input.size,
      type: ctx.input.format
    });

    return {
      output: {
        qrCode,
        linkId: ctx.input.linkId
      },
      message: `Generated QR code for link **${ctx.input.linkId}**`
    };
  })
  .build();
