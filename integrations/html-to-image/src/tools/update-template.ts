import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTemplate = SlateTool.create(spec, {
  name: 'Update Template',
  key: 'update_template',
  description: `Update an existing image template. Editing a template creates a new version, so previous versions remain available. When generating images, the latest version is used by default unless a specific version is targeted.`,
  instructions: [
    'Updates create a new template version rather than modifying the existing one.',
    'Unlimited edits are supported on all plans.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      templateId: z.string().describe('ID of the template to update'),
      html: z.string().describe('Updated HTML markup for the template'),
      css: z.string().optional().describe('Updated CSS styling for the template'),
      name: z.string().optional().describe('Updated name of the template'),
      description: z.string().optional().describe('Updated description of the template'),
      googleFonts: z.string().optional().describe('Google Fonts to load, separated by pipe'),
      selector: z.string().optional().describe('CSS selector to crop the image'),
      msDelay: z.number().optional().describe('Milliseconds to delay before capturing'),
      deviceScale: z.number().min(1).max(3).optional().describe('Pixel ratio (1-3)'),
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
      templateId: z.string().describe('ID of the updated template'),
      templateVersion: z.number().describe('New version number after the update')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.updateTemplate(ctx.input.templateId, {
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
      message: `Template **${result.templateId}** updated to version **${result.templateVersion}**.`
    };
  })
  .build();
