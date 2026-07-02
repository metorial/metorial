import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTemplate = SlateTool.create(spec, {
  name: 'Get Template',
  key: 'get_template',
  description: `Retrieve full details of an inspection template by its ID or by an inspection ID. Returns the template structure including questions, response options, and metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      templateId: z.string().optional().describe('The template ID to retrieve'),
      inspectionId: z
        .string()
        .optional()
        .describe(
          'Get the template associated with this inspection ID (alternative to templateId)'
        )
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique template identifier'),
      name: z.string().optional().describe('Template name'),
      description: z.string().optional().describe('Template description'),
      modifiedAt: z.string().optional().describe('Last modification timestamp'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      rawTemplate: z.any().describe('Full template data including questions and structure')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (!ctx.input.templateId && !ctx.input.inspectionId) {
      throw new Error('Either templateId or inspectionId must be provided');
    }

    let template: any;
    if (ctx.input.templateId) {
      template = await client.getTemplate(ctx.input.templateId);
    } else {
      template = await client.getTemplateByInspection(ctx.input.inspectionId!);
    }

    return {
      output: {
        templateId: template.template_id || template.id,
        name: template.name || template.title,
        description: template.description,
        modifiedAt: template.modified_at,
        createdAt: template.created_at,
        rawTemplate: template
      },
      message: `Retrieved template **${template.name || template.title || template.template_id || template.id}**.`
    };
  })
  .build();
