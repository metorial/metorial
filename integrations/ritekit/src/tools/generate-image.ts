import { SlateTool } from 'slates';
import { z } from 'zod';
import { RiteKitClient } from '../lib/client';
import { deliverImageDownload } from '../lib/images';
import { spec } from '../spec';

export let generateImage = SlateTool.create(spec, {
  name: 'Generate Image',
  key: 'generate_image',
  description: `Creates a styled quote image from text with configurable fonts, colors, backgrounds, and branding. Use optional dimensions and font weights for social media graphics and quote cards. To animate an existing image, use Animate Image.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      width: z.number().int().positive().optional().describe('Image width in pixels'),
      height: z.number().int().positive().optional().describe('Image height in pixels'),
      textFontWeight: z
        .union([z.literal(400), z.literal(700)])
        .optional()
        .describe('Quote font weight: 400 normal, 700 bold'),
      authorFontWeight: z
        .union([z.literal(400), z.literal(700)])
        .optional()
        .describe('Author font weight: 400 normal, 700 bold'),
      quote: z.string().describe('Quote or text to render on the image'),
      author: z.string().describe('Author or source attribution text'),
      fontSize: z.number().optional().describe('Font size for the quote text'),
      quoteFont: z.string().optional().describe('Font family for the quote text'),
      quoteFontColor: z
        .string()
        .optional()
        .describe('Hex color code for the quote text (e.g., "#ffffff")'),
      authorFont: z.string().optional().describe('Font family for the author text'),
      authorFontColor: z.string().optional().describe('Hex color code for the author text'),
      enableHighlight: z
        .boolean()
        .optional()
        .describe('Enable text highlighting behind the quote'),
      highlightColor: z.string().optional().describe('Hex color for the text highlight'),
      bgType: z
        .enum(['solid', 'gradient'])
        .optional()
        .describe('Background type: solid color or gradient'),
      backgroundColor: z.string().optional().describe('Hex color for solid background'),
      gradientType: z
        .enum(['linear', 'radial'])
        .optional()
        .describe('Gradient direction type'),
      gradientColor1: z.string().optional().describe('First gradient color (hex)'),
      gradientColor2: z.string().optional().describe('Second gradient color (hex)'),
      brandLogoUrl: z
        .string()
        .optional()
        .describe('URL of a brand logo to overlay on the image'),
      animation: z
        .enum(['none', 'rays', 'glint', 'circle'])
        .optional()
        .describe(
          'Quote animation option; the current API documentation does not guarantee these effects'
        ),
      showQuoteMark: z
        .boolean()
        .optional()
        .describe('Whether to show quotation marks on the image')
    })
  )
  .output(
    z.object({
      downloadError: z
        .string()
        .optional()
        .describe('Reason the downloadable copy could not be prepared'),
      raw: z.record(z.string(), z.unknown()).optional().describe('Complete provider response'),
      imageUrl: z.string().describe('URL of the generated image')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RiteKitClient({ token: ctx.auth.token });

    let result = await client.textToImage({
      width: ctx.input.width,
      height: ctx.input.height,
      textFontWeight: ctx.input.textFontWeight,
      authorFontWeight: ctx.input.authorFontWeight,
      quote: ctx.input.quote,
      author: ctx.input.author,
      fontSize: ctx.input.fontSize,
      quoteFont: ctx.input.quoteFont,
      quoteFontColor: ctx.input.quoteFontColor,
      authorFont: ctx.input.authorFont,
      authorFontColor: ctx.input.authorFontColor,
      enableHighlight:
        ctx.input.enableHighlight !== undefined
          ? ctx.input.enableHighlight
            ? 1
            : 0
          : undefined,
      highlightColor: ctx.input.highlightColor,
      bgType: ctx.input.bgType,
      backgroundColor: ctx.input.backgroundColor,
      gradientType: ctx.input.gradientType,
      gradientColor1: ctx.input.gradientColor1,
      gradientColor2: ctx.input.gradientColor2,
      brandLogo: ctx.input.brandLogoUrl,
      animation: ctx.input.animation,
      showQuoteMark:
        ctx.input.showQuoteMark !== undefined ? (ctx.input.showQuoteMark ? 1 : 0) : undefined
    });

    let downloadError = await deliverImageDownload(result.url, content =>
      ctx.addAttachment({ type: 'content', content })
    );

    return {
      output: {
        raw: { ...result },
        downloadError,
        imageUrl: result.url
      },
      message: `${downloadError ? `${downloadError} ` : ''}Generated quote image: ${result.url}`
    };
  })
  .build();
