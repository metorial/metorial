import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateImageFromTemplate = SlateTool.create(spec, {
  name: 'Generate Image from Template',
  key: 'generate_image_from_template',
  description: `Generate an image using a pre-defined template with dynamic variable substitution. Templates use Handlebars syntax (e.g., \`{{title_text}}\`) for placeholders. Provide template values to fill in the variables and produce a customized image. Useful for generating dynamic social sharing images, certificates, badges, and other templated visuals.`,
  instructions: [
    'The provider requires templateValues. Pass the selected template variables as key-value pairs; use list_templates to inspect its Handlebars placeholders.',
    'By default, the most recent template version is used. Specify `templateVersion` to target a specific version.',
    'Rendering uses the saved template settings; use update_template to change the template layout or rendering configuration.'
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
        .describe('CSS selector to crop the image to a specific element'),
      format: z
        .enum(['png', 'jpg', 'webp', 'pdf'])
        .optional()
        .describe('Format of the downloadable result; defaults to PNG')
    })
  )
  .output(
    z.object({
      imageId: z.string().describe('Unique identifier for the generated image'),
      url: z
        .string()
        .describe(
          'Provider URL of the generated image, hosted while the account remains active'
        ),
      pngUrl: z.string().describe('Direct URL to the PNG version'),
      jpgUrl: z.string().describe('Direct URL to the JPG version'),
      webpUrl: z.string().describe('Direct URL to the WebP version'),
      pdfUrl: z.string().describe('Direct URL to the PDF version'),
      deliveryWarning: z
        .string()
        .optional()
        .describe(
          'File delivery warning if the image was created but could not be prepared for download'
        ),
      raw: z
        .record(z.string(), z.unknown())
        .describe('Provider response with credentials removed')
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
      selector: ctx.input.selector,
      format: ctx.input.format
    });

    let format = ctx.input.format ?? 'png';
    let deliveryWarning: string | undefined;
    try {
      await ctx.addAttachment({
        type: 'url',
        url: result[`${format}Url`],
        mimeType:
          format === 'pdf' ? 'application/pdf' : `image/${format === 'jpg' ? 'jpeg' : format}`,
        filename: `${result.imageId}.${format}`
      });
    } catch {
      deliveryWarning =
        'The image was created, but its file could not be prepared for download. Use download_image with this image ID; do not generate another image to retry delivery.';
    }

    return {
      output: { ...result, deliveryWarning },
      message:
        deliveryWarning ??
        'Image generated from template successfully. Available for download.'
    };
  })
  .build();
