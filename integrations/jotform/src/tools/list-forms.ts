import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listFormsTool = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List all forms in the authenticated JotForm account. Supports filtering by status, sorting, and pagination. Use this to browse available forms or find specific forms by title or status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['ENABLED', 'DISABLED', 'DELETED'])
        .optional()
        .describe('Filter forms by status'),
      sortBy: z
        .enum(['created_at', 'updated_at', 'title'])
        .optional()
        .describe('Field to sort results by'),
      sortDirection: z.enum(['ASC', 'DESC']).optional().describe('Sort direction'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of forms to return (default 20, max 1000)'),
      offset: z.number().optional().describe('Number of forms to skip for pagination')
    })
  )
  .output(
    z.object({
      forms: z.array(
        z.object({
          formId: z.string().describe('Unique form identifier'),
          title: z.string().describe('Form title'),
          status: z.string().describe('Form status (ENABLED, DISABLED, DELETED)'),
          createdAt: z.string().describe('Form creation date'),
          updatedAt: z.string().describe('Last update date'),
          submissionCount: z.string().describe('Total number of submissions'),
          url: z.string().describe('Public URL of the form')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiDomain: ctx.config.apiDomain
    });

    let filter: Record<string, any> | undefined;
    if (ctx.input.status) {
      filter = { status: ctx.input.status };
    }

    let forms = await client.listForms({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      orderby: ctx.input.sortBy,
      direction: ctx.input.sortDirection,
      filter
    });

    let mapped = (forms || []).map((f: any) => ({
      formId: String(f.id),
      title: f.title || '',
      status: f.status || '',
      createdAt: f.created_at || '',
      updatedAt: f.updated_at || '',
      submissionCount: String(f.count || '0'),
      url: f.url || ''
    }));

    return {
      output: { forms: mapped },
      message: `Found **${mapped.length}** form(s).`
    };
  })
  .build();
