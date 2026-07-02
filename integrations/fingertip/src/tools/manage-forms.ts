import { SlateTool } from 'slates';
import { z } from 'zod';
import { FingertipClient } from '../lib/client';
import { spec } from '../spec';

export let listFormTemplates = SlateTool.create(spec, {
  name: 'List Form Templates',
  key: 'list_form_templates',
  description: `List form templates for a site. Form templates define the structure and fields of forms that collect visitor submissions.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      siteId: z.string().describe('ID of the site to list form templates for'),
      search: z.string().optional().describe('Search by form title'),
      cursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default: 10, max: 25)'),
      sortBy: z
        .enum(['createdAt', 'updatedAt', 'title'])
        .optional()
        .describe('Field to sort by'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction')
    })
  )
  .output(
    z.object({
      formTemplates: z.array(
        z.object({
          formTemplateId: z.string(),
          slug: z.string(),
          title: z.string(),
          description: z.string().nullable(),
          status: z.string(),
          responseCount: z.number(),
          siteId: z.string(),
          createdAt: z.string(),
          updatedAt: z.string()
        })
      ),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listFormTemplates({
      siteId: ctx.input.siteId,
      search: ctx.input.search,
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection
    });

    let formTemplates = result.items.map(ft => ({
      formTemplateId: ft.id,
      slug: ft.slug,
      title: ft.title,
      description: ft.description,
      status: ft.status,
      responseCount: ft.responseCount,
      siteId: ft.siteId,
      createdAt: ft.createdAt,
      updatedAt: ft.updatedAt
    }));

    return {
      output: {
        formTemplates,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** form template(s). Returned ${formTemplates.length} on this page.`
    };
  })
  .build();

export let listFormResponses = SlateTool.create(spec, {
  name: 'List Form Responses',
  key: 'list_form_responses',
  description: `List form submission responses for a specific form template. Each response represents data submitted by a site visitor.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      formTemplateId: z.string().describe('ID of the form template to retrieve responses for'),
      siteId: z.string().describe('ID of the site'),
      cursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of items per page (default: 10, max: 25)')
    })
  )
  .output(
    z.object({
      responses: z.array(z.any()),
      total: z.number(),
      hasNextPage: z.boolean(),
      endCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new FingertipClient(ctx.auth.token);
    let result = await client.listFormResponses({
      formTemplateId: ctx.input.formTemplateId,
      siteId: ctx.input.siteId,
      cursor: ctx.input.cursor,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        responses: result.items,
        total: result.total,
        hasNextPage: result.pageInfo.hasNextPage,
        endCursor: result.pageInfo.endCursor
      },
      message: `Found **${result.total}** form response(s). Returned ${result.items.length} on this page.`
    };
  })
  .build();
