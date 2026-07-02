import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTemplate = SlateTool.create(spec, {
  name: 'Create Template',
  key: 'create_template',
  description: `Create a reusable image template with Handlebars variable placeholders. Templates allow you to define HTML that includes variables like \`{{title_text}}\` which can be substituted with dynamic values when generating images. Useful for creating consistent image layouts for social sharing, certificates, and other dynamic visuals.`,
  instructions: [
    'Use Handlebars syntax (e.g., `{{variable_name}}`) in the HTML to define dynamic placeholders.',
    'Free plans are limited to 1 template. Paid plans support up to 1,000 templates.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      html: z
        .string()
        .describe(
          'HTML markup for the template, may include Handlebars variables (e.g., {{title}})'
        ),
      css: z.string().optional().describe('CSS styling for the template'),
      name: z.string().optional().describe('Name of the template'),
      description: z.string().optional().describe('Description of the template'),
      googleFonts: z
        .string()
        .optional()
        .describe('Google Fonts to load, separated by pipe (e.g., "Roboto|Open Sans")'),
      selector: z
        .string()
        .optional()
        .describe('CSS selector to crop the image to a specific element'),
      msDelay: z.number().optional().describe('Milliseconds to delay before capturing'),
      deviceScale: z
        .number()
        .min(1)
        .max(3)
        .optional()
        .describe('Pixel ratio for the screenshot (1-3)'),
      renderWhenReady: z
        .boolean()
        .optional()
        .describe('Wait for ScreenshotReady() call before capturing'),
      viewportWidth: z.number().optional().describe('Chrome viewport width in pixels'),
      viewportHeight: z.number().optional().describe('Chrome viewport height in pixels'),
      colorScheme: z.enum(['light', 'dark']).optional().describe('Color scheme preference'),
      timezone: z.string().optional().describe('IANA timezone identifier')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique identifier for the created template'),
      templateVersion: z.number().describe('Version number of the template')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.createTemplate({
      html: ctx.input.html,
      css: ctx.input.css,
      name: ctx.input.name,
      description: ctx.input.description,
      googleFonts: ctx.input.googleFonts,
      selector: ctx.input.selector,
      msDelay: ctx.input.msDelay,
      deviceScale: ctx.input.deviceScale,
      renderWhenReady: ctx.input.renderWhenReady,
      viewportWidth: ctx.input.viewportWidth,
      viewportHeight: ctx.input.viewportHeight,
      colorScheme: ctx.input.colorScheme,
      timezone: ctx.input.timezone
    });

    return {
      output: result,
      message: `Template created successfully with ID **${result.templateId}** (version ${result.templateVersion}).`
    };
  })
  .build();
