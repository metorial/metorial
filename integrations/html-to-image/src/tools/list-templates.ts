import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Retrieve a page of image templates on your account, or a page of versions of a specific template. Returns template metadata including HTML, CSS, rendering configuration, and usage counts.`,
  instructions: [
    'Omit `templateId` to list templates. Provide a `templateId` to list versions of that template.',
    'For another page, pass the returned pagination cursor as maxVersion.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z
        .string()
        .optional()
        .describe(
          'If provided, lists versions of this specific template. Otherwise lists templates.'
        ),
      count: z
        .number()
        .optional()
        .describe('Number of templates or versions per page (1-100)'),
      maxVersion: z
        .number()
        .optional()
        .describe(
          'Pagination version cursor from the previous result; omit for the first page'
        )
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique identifier for the template'),
            templateVersion: z.number().describe('Version of the template'),
            name: z.string().optional().describe('Name of the template'),
            description: z.string().optional().describe('Description of the template'),
            html: z.string().describe('HTML markup of the template'),
            css: z.string().optional().describe('CSS styling of the template'),
            googleFonts: z.string().optional().describe('Google Fonts configured'),
            msDelay: z.number().optional().describe('Render delay in milliseconds'),
            deviceScale: z.number().optional().describe('Device scale factor'),
            viewportWidth: z.number().optional().describe('Viewport width'),
            viewportHeight: z.number().optional().describe('Viewport height'),
            renderCount: z
              .number()
              .optional()
              .describe('Number of times this template has been used to render images'),
            createdAt: z
              .string()
              .optional()
              .describe('Timestamp when the template was created'),
            raw: z
              .record(z.string(), z.unknown())
              .describe(
                'Original template metadata, including nulls, with credentials removed'
              )
          })
        )
        .describe('List of templates or template versions'),
      pagination: z
        .record(z.string(), z.unknown())
        .describe('Provider pagination metadata; use the next cursor for maxVersion'),
      raw: z
        .record(z.string(), z.unknown())
        .describe('Provider list response with credentials removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      userId: ctx.auth.userId,
      token: ctx.auth.token
    });

    let result = await client.listTemplates(
      ctx.input.templateId,
      ctx.input.count,
      ctx.input.maxVersion
    );

    let label = ctx.input.templateId
      ? `versions of template **${ctx.input.templateId}**`
      : 'template(s)';

    return {
      output: result,
      message: `Retrieved **${result.templates.length}** ${label}.`
    };
  })
  .build();
