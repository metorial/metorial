import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let listDocumentTemplates = SlateTool.create(spec, {
  name: 'List Document Templates',
  key: 'list_document_templates',
  description: `List available document templates (PDF, DOCX, XLSX). Filter by name substring or tags.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter templates by name (substring match)'),
      tags: z
        .string()
        .optional()
        .describe(
          'Filter by tags. Use ";;" for OR logic within a tag, multiple tags for AND logic.'
        )
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Unique template identifier'),
            templateName: z.string().optional().describe('Name of the template'),
            templateType: z.string().optional().describe('Document type (pdf, docx, xlsx)'),
            tags: z.array(z.string()).optional().describe('Tags assigned to the template')
          })
        )
        .describe('List of document templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let templates = await client.listDocumentTemplates({
      name: ctx.input.name,
      tags: ctx.input.tags
    });

    let mapped = templates.map((t: any) => ({
      templateId: t.id || t.uuid,
      templateName: t.name,
      templateType: t.type,
      tags: t.tags
    }));

    return {
      output: { templates: mapped },
      message: `Found **${mapped.length}** document template(s).`
    };
  })
  .build();
