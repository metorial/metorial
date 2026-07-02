import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `List document templates from your DocuSeal account. Filter by name, folder, external ID, or archived status. Returns template details including fields, submitter roles, and documents. Supports pagination for large result sets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search by template name (partial match)'),
      folder: z.string().optional().describe('Filter by folder name'),
      externalId: z.string().optional().describe('Filter by external ID'),
      archived: z.boolean().optional().describe('Set true to retrieve archived templates'),
      limit: z
        .number()
        .optional()
        .describe('Number of results to return (max 100, default 10)'),
      after: z
        .number()
        .optional()
        .describe('Cursor for pagination: return templates after this ID'),
      before: z
        .number()
        .optional()
        .describe('Cursor for pagination: return templates before this ID')
    })
  )
  .output(
    z.object({
      templates: z
        .array(
          z.object({
            templateId: z.number().describe('Template ID'),
            name: z.string().describe('Template name'),
            slug: z.string().optional().describe('Template slug'),
            externalId: z.string().nullable().optional().describe('External ID'),
            folderName: z.string().nullable().optional().describe('Folder name'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last updated timestamp'),
            archivedAt: z.string().nullable().optional().describe('Archived timestamp')
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let data = await client.listTemplates({
      q: ctx.input.query,
      folder: ctx.input.folder,
      externalId: ctx.input.externalId,
      archived: ctx.input.archived,
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let templates = (Array.isArray(data) ? data : data.data || []).map((t: any) => ({
      templateId: t.id,
      name: t.name,
      slug: t.slug,
      externalId: t.external_id,
      folderName: t.folder_name,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      archivedAt: t.archived_at
    }));

    return {
      output: { templates },
      message: `Found **${templates.length}** template(s).`
    };
  })
  .build();
