import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List document templates in your Docupilot workspace. Filter by folder, template type, output format, status, or search by name. Returns paginated results with template metadata including type, status, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folderId: z.number().optional().describe('Filter templates by folder ID'),
      search: z.string().optional().describe('Search templates by name'),
      templateType: z
        .enum(['docx', 'html', 'fillable_pdf', 'pptx', 'xlsx'])
        .optional()
        .describe('Filter by template format type'),
      outputType: z
        .enum(['html', 'pdf', 'png', 'docx', 'pptx', 'xlsx'])
        .optional()
        .describe('Filter by output format'),
      status: z
        .enum(['active', 'test'])
        .optional()
        .describe('Filter by document status (active = published, test = draft)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching templates'),
      templates: z.array(
        z.object({
          templateId: z.number().describe('Unique template ID'),
          title: z.string().describe('Template title'),
          description: z.string().nullable().optional().describe('Template description'),
          type: z.string().describe('Template format type (docx, html, fillable_pdf, etc.)'),
          status: z.string().optional().describe('Document status (active or test)'),
          outputType: z.string().optional().describe('Output format type'),
          folderId: z
            .number()
            .nullable()
            .optional()
            .describe('ID of the folder containing this template'),
          folderName: z
            .string()
            .nullable()
            .optional()
            .describe('Name of the folder containing this template'),
          createdTime: z.string().describe('Template creation timestamp'),
          updatedTime: z.string().nullable().describe('Last update timestamp')
        })
      ),
      hasMore: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.auth.workspaceId
    });

    let result = await client.listTemplates({
      folder: ctx.input.folderId,
      search: ctx.input.search,
      type: ctx.input.templateType,
      outputType: ctx.input.outputType,
      status: ctx.input.status,
      page: ctx.input.page
    });

    let templates = result.results.map(t => ({
      templateId: t.id,
      title: t.title,
      description: t.description ?? null,
      type: t.type,
      status: t.document_status,
      outputType: t.preferences?.output_type,
      folderId: t.folder?.id ?? null,
      folderName: t.folder?.name ?? null,
      createdTime: t.created_time,
      updatedTime: t.updated_time
    }));

    return {
      output: {
        totalCount: result.count,
        templates,
        hasMore: result.next !== null
      },
      message: `Found **${result.count}** templates${ctx.input.search ? ` matching "${ctx.input.search}"` : ''}. Showing ${templates.length} results${result.next ? ' (more pages available)' : ''}.`
    };
  })
  .build();
