import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listForms = SlateTool.create(spec, {
  name: 'List Forms',
  key: 'list_forms',
  description: `List all forms in your Tally account with pagination support. Use this to browse available forms, find a specific form, or get an overview of all forms in a workspace.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      limit: z
        .number()
        .optional()
        .describe('Number of forms per page (default varies by API)'),
      workspaceId: z.string().optional().describe('Filter forms by workspace ID')
    })
  )
  .output(
    z.object({
      page: z.number().describe('Current page number'),
      limit: z.number().describe('Number of items per page'),
      hasMore: z.boolean().describe('Whether more pages are available'),
      forms: z
        .array(
          z.object({
            formId: z.string().describe('Unique form identifier'),
            name: z.string().describe('Form name'),
            workspaceId: z.string().nullable().describe('Workspace the form belongs to'),
            status: z.string().describe('Form status (e.g., PUBLISHED, DRAFT)'),
            numberOfSubmissions: z.number().describe('Total number of submissions'),
            isClosed: z.boolean().describe('Whether the form is closed for new submissions'),
            createdAt: z.string().describe('ISO 8601 creation timestamp'),
            updatedAt: z.string().describe('ISO 8601 last update timestamp')
          })
        )
        .describe('List of forms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listForms({
      page: ctx.input.page,
      limit: ctx.input.limit,
      workspaceId: ctx.input.workspaceId
    });

    let forms = result.items.map(form => ({
      formId: form.id,
      name: form.name,
      workspaceId: form.workspaceId,
      status: form.status,
      numberOfSubmissions: form.numberOfSubmissions,
      isClosed: form.isClosed,
      createdAt: form.createdAt,
      updatedAt: form.updatedAt
    }));

    return {
      output: {
        page: result.page,
        limit: result.limit,
        hasMore: result.hasMore,
        forms
      },
      message: `Found **${forms.length}** form(s) on page ${result.page}. ${result.hasMore ? 'More pages available.' : 'No more pages.'}`
    };
  })
  .build();
