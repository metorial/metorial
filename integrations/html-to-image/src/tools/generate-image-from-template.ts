import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImageFromTemplate = SlateTool.create(spec, {
  name: 'Generate Image from Template',
  key: 'generate_image_from_template',
  description: `Generate an image using a pre-defined template with dynamic variable substitution. Templates use Handlebars syntax (e.g., \`{{title_text}}\`) for placeholders. Provide template values to fill in the variables and produce a customized image. Useful for generating dynamic social sharing images, certificates, badges, and other templated visuals.`,
  instructions: [
    'Template variables use Handlebars syntax. Pass variable values as key-value pairs in `templateValues`.',
    'By default, the most recent template version is used. Specify `templateVersion` to target a specific version.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to use for image generation'),
      templateValues: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs for Handlebars variable substitution in the template'),
      templateVersion: z
        .number()
        .optional()
        .describe('Specific template version to use (defaults to latest)'),
      googleFonts: z
        .string()
        .optional()
        .describe('Google Fonts to load, separated by pipe (e.g., "Roboto|Open Sans")'),
      msDelay: z
        .number()
        .optional()
        .describe('Milliseconds to delay before capturing the image'),
      deviceScale: z
        .number()
        .min(1)
        .max(3)
        .optional()
        .describe('Pixel ratio for the screenshot (1-3)'),
      viewportWidth: z.number().optional().describe('Chrome viewport width in pixels'),
      viewportHeight: z.number().optional().describe('Chrome viewport height in pixels'),
      selector: z
        .string()
        .optional()
        .describe('CSS selector to crop the image to a specific element')
    })
  )
  .output(
    z.object({
      imageId: z.string().describe('Unique identifier for the generated image'),
      url: z.string().describe('Permanent CDN-cached URL of the generated image'),
      pngUrl: z.string().describe('Direct URL to the PNG version'),
      jpgUrl: z.string().describe('Direct URL to the JPG version'),
      webpUrl: z.string().describe('Direct URL to the WebP version'),
      pdfUrl: z.string().describe('Direct URL to the PDF version')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.createImage({
      templateId: ctx.input.templateId,
      templateValues: ctx.input.templateValues,
      templateVersion: ctx.input.templateVersion,
      googleFonts: ctx.input.googleFonts,
      msDelay: ctx.input.msDelay,
      deviceScale: ctx.input.deviceScale,
      viewportWidth: ctx.input.viewportWidth,
      viewportHeight: ctx.input.viewportHeight,
      selector: ctx.input.selector
    });

    let baseUrl = result.url;

    return {
      output: {
        imageId: result.imageId,
        url: baseUrl,
        pngUrl: `${baseUrl}.png`,
        jpgUrl: `${baseUrl}.jpg`,
        webpUrl: `${baseUrl}.webp`,
        pdfUrl: `${baseUrl}.pdf`
      },
      message: `Image generated from template **${ctx.input.templateId}** successfully. Available at: ${baseUrl}`
    };
  })
  .build();
