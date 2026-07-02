import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List projects in Zoho Invoice with optional filtering by customer and status. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().optional().describe('Filter projects by customer ID'),
      status: z.enum(['active', 'inactive']).optional().describe('Filter projects by status'),
      sortColumn: z
        .string()
        .optional()
        .describe('Column to sort results by (e.g. "project_name", "created_time")'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      perPage: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      projects: z
        .array(
          z.object({
            projectId: z.string().describe('Unique ID of the project'),
            projectName: z.string().optional().describe('Name of the project'),
            customerName: z.string().optional().describe('Associated customer name'),
            customerId: z.string().optional().describe('Associated customer ID'),
            status: z.string().optional().describe('Current status of the project'),
            billingType: z.string().optional().describe('Billing type of the project'),
            totalHours: z.string().optional().describe('Total logged hours'),
            billableHours: z.string().optional().describe('Total billable hours'),
            createdTime: z
              .string()
              .optional()
              .describe('Timestamp when the project was created')
          })
        )
        .describe('Array of projects'),
      page: z.number().optional().describe('Current page number'),
      perPage: z.number().optional().describe('Number of results per page'),
      hasMorePages: z
        .boolean()
        .optional()
        .describe('Whether more pages of results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId,
      region: ctx.auth.region
    });

    let params: Record<string, any> = {};

    if (ctx.input.customerId) params.customer_id = ctx.input.customerId;
    if (ctx.input.status)
      params.filter_by = ctx.input.status === 'active' ? 'Status.Active' : 'Status.Inactive';
    if (ctx.input.sortColumn) params.sort_column = ctx.input.sortColumn;
    if (ctx.input.page !== undefined) params.page = ctx.input.page;
    if (ctx.input.perPage !== undefined) params.per_page = ctx.input.perPage;

    let result = await client.listProjects(params);

    let projects = (result.projects || []).map((p: any) => ({
      projectId: p.project_id,
      projectName: p.project_name,
      customerName: p.customer_name,
      customerId: p.customer_id,
      status: p.status,
      billingType: p.billing_type,
      totalHours: p.total_hours,
      billableHours: p.billable_hours,
      createdTime: p.created_time
    }));

    let pageContext = result.pageContext;
    let page = pageContext?.page;
    let perPage = pageContext?.per_page;
    let hasMorePages = pageContext?.has_more_page ?? false;

    return {
      output: { projects, page, perPage, hasMorePages },
      message: `Found **${projects.length}** project(s).${hasMorePages ? ' More pages available.' : ''}`
    };
  })
  .build();
