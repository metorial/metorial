import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List available document templates in a workspace. Returns paginated template cards that can be filtered by folder and sorted.`,
  instructions: [
    'The workspaceId is required. It is the PDFMonkey workspace/app ID shown in template responses as app_id.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('ID of the workspace to list templates from'),
      folders: z
        .string()
        .optional()
        .describe(
          'Comma-separated folder IDs to filter by, or "none" for templates at root level'
        ),
      page: z.number().optional().describe('Page number for pagination'),
      sort: z
        .enum(['identifier', 'created_at', 'updated_at'])
        .optional()
        .describe('Sort order for results')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('ID of the template'),
            identifier: z.string().describe('Human-readable name'),
            workspaceId: z.string().describe('Workspace ID'),
            editionMode: z.string().nullable().describe('Template editor mode'),
            outputType: z.string().nullable().describe('Template output type'),
            pdfEngineName: z.string().nullable().describe('PDF engine name'),
            isDraft: z.boolean().nullable().describe('Whether the template has draft changes'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp')
          })
        )
        .describe('List of template cards'),
      currentPage: z.number().describe('Current page number'),
      totalPages: z.number().describe('Total number of pages'),
      nextPage: z.number().nullable().describe('Next page number or null'),
      prevPage: z.number().nullable().describe('Previous page number or null')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTemplates({
      workspaceId: ctx.input.workspaceId,
      folders: ctx.input.folders,
      page: ctx.input.page,
      sort: ctx.input.sort
    });

    let templates = result.templates.map(tmpl => ({
      templateId: String(tmpl.id),
      identifier: String(tmpl.identifier),
      workspaceId: String(tmpl.app_id),
      editionMode: tmpl.edition_mode ? String(tmpl.edition_mode) : null,
      outputType: tmpl.output_type ? String(tmpl.output_type) : null,
      pdfEngineName: tmpl.pdf_engine_name ? String(tmpl.pdf_engine_name) : null,
      isDraft: tmpl.is_draft == null ? null : Boolean(tmpl.is_draft),
      createdAt: String(tmpl.created_at),
      updatedAt: String(tmpl.updated_at)
    }));

    let meta = result.meta;

    return {
      output: {
        templates,
        currentPage: Number(meta.current_page),
        totalPages: Number(meta.total_pages),
        nextPage: meta.next_page ? Number(meta.next_page) : null,
        prevPage: meta.prev_page ? Number(meta.prev_page) : null
      },
      message: `Found **${templates.length}** template(s) on page ${meta.current_page} of ${meta.total_pages}.`
    };
  })
  .build();
