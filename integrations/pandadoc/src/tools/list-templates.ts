import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let listTemplates = SlateTool.create(spec, {
  name: 'List Templates',
  key: 'list_templates',
  description: `Search and list PandaDoc templates with optional filtering by name, folder, tag, and sharing status. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search by template name'),
      shared: z.boolean().optional().describe('Return only shared templates'),
      deleted: z.boolean().optional().describe('Return only deleted templates'),
      folderUuid: z.string().optional().describe('Filter by folder UUID'),
      tag: z.string().optional().describe('Filter by template tag'),
      page: z.number().optional().describe('Page number (starts at 1)'),
      count: z.number().optional().describe('Items per page (max 100, default 50)')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching templates'),
      templates: z
        .array(
          z.object({
            templateId: z.string().describe('Template UUID'),
            templateName: z.string().describe('Template name'),
            dateCreated: z.string().optional().describe('ISO 8601 creation date'),
            dateModified: z.string().optional().describe('ISO 8601 last modified date'),
            version: z.string().optional().describe('Template version')
          })
        )
        .describe('List of templates')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let params: any = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.shared !== undefined) params.shared = ctx.input.shared;
    if (ctx.input.deleted !== undefined) params.deleted = ctx.input.deleted;
    if (ctx.input.folderUuid) params.folder_uuid = ctx.input.folderUuid;
    if (ctx.input.tag) params.tag = ctx.input.tag;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.count) params.count = ctx.input.count;

    let result = await client.listTemplates(params);

    let templates = (result.results || []).map((t: any) => ({
      templateId: t.id,
      templateName: t.name,
      dateCreated: t.date_created,
      dateModified: t.date_modified,
      version: t.version
    }));

    return {
      output: {
        totalCount: result.count || templates.length,
        templates
      },
      message: `Found **${result.count || templates.length}** templates. Returned ${templates.length} results.`
    };
  })
  .build();
