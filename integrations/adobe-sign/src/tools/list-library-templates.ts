import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLibraryTemplates = SlateTool.create(spec, {
  name: 'List Library Templates',
  key: 'list_library_templates',
  description: `List available library document templates. Returns reusable templates that can be referenced when creating agreements or web forms.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      pageSize: z.number().optional().describe('Number of templates per page')
    })
  )
  .output(
    z.object({
      libraryDocuments: z
        .array(
          z.object({
            libraryDocumentId: z.string().describe('ID of the library template'),
            name: z.string().describe('Name of the library template'),
            modifiedDate: z.string().optional().describe('Last modification date'),
            sharingMode: z.string().optional().describe('Sharing scope of the template'),
            status: z.string().optional().describe('Current status'),
            templateTypes: z.array(z.string()).optional().describe('Template types')
          })
        )
        .describe('List of library templates'),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiBaseUrl: ctx.auth.apiBaseUrl,
      shard: ctx.auth.shard
    });

    let result = await client.listLibraryDocuments({
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    let templates = (result.libraryDocumentList || []).map((t: any) => ({
      libraryDocumentId: t.id,
      name: t.name,
      modifiedDate: t.modifiedDate,
      sharingMode: t.sharingMode,
      status: t.status,
      templateTypes: t.templateTypes
    }));

    return {
      output: {
        libraryDocuments: templates,
        cursor: result.page?.nextCursor
      },
      message: `Found **${templates.length}** library template(s).`
    };
  });
