import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateQrCode = SlateTool.create(spec, {
  name: 'Generate QR Code',
  key: 'generate_qr_code',
  description: `Generate a QR code in SVG format for a shortened URL. Customize the QR code appearance with width, margin, error correction level, and foreground/background colors.`,
  constraints: ['Only SVG format is supported.', 'The URL must be a shortened URL from U301.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z
        .string()
        .describe('The shortened URL to generate a QR code for (e.g., "u301.co/ax")'),
      width: z.number().optional().describe('QR code width in pixels'),
      margin: z.number().optional().describe('QR code padding in pixels'),
      level: z
        .enum(['L', 'M', 'Q', 'H'])
        .optional()
        .describe(
          'Error correction level: L (low), M (medium, default), Q (quartile), H (high)'
        ),
      dark: z
        .string()
        .optional()
        .describe('Hex color for foreground/dark elements (e.g., "333333")'),
      light: z
        .string()
        .optional()
        .describe('Hex color for background/light elements (e.g., "ffffff")')
    })
  )
  .output(
    z.object({
      svgContent: z.string().describe('The QR code in SVG format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    ctx.progress('Generating QR code...');

    let svg = await client.generateQrCode({
      url: ctx.input.url,
      width: ctx.input.width,
      margin: ctx.input.margin,
      level: ctx.input.level,
      dark: ctx.input.dark,
      light: ctx.input.light
    });

    return {
      output: {
        svgContent: svg
      },
      message: `QR code generated for **${ctx.input.url}** in SVG format.`
    };
  })
  .build();
