import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let listEpics = SlateTool.create(spec, {
  name: 'List Epics',
  key: 'list_epics',
  description: `List epics from Aha!, optionally filtered by product or release. Returns epic names, reference numbers, statuses, and progress. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().optional().describe('Filter by product ID or reference prefix'),
      releaseId: z.string().optional().describe('Filter by release ID or reference number'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only return epics updated since this date (ISO 8601)'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      perPage: z.number().optional().describe('Records per page (max 200)')
    })
  )
  .output(
    z.object({
      epics: z.array(
        z.object({
          epicId: z.string().describe('Epic ID'),
          referenceNum: z.string().describe('Epic reference number'),
          name: z.string().describe('Epic name'),
          status: z.string().optional().describe('Workflow status name'),
          assignee: z.string().optional().describe('Assigned user name'),
          progress: z.number().optional().describe('Progress percentage'),
          url: z.string().optional().describe('Aha! URL'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      ),
      totalRecords: z.number().describe('Total number of epics'),
      totalPages: z.number().describe('Total number of pages'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);

    let result = await client.listEpics({
      productId: ctx.input.productId,
      releaseId: ctx.input.releaseId,
      updatedSince: ctx.input.updatedSince,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let epics = result.epics.map(e => ({
      epicId: e.id,
      referenceNum: e.reference_num,
      name: e.name,
      status: e.workflow_status?.name,
      assignee: e.assigned_to_user?.name,
      progress: e.progress,
      url: e.url,
      updatedAt: e.updated_at
    }));

    return {
      output: {
        epics,
        totalRecords: result.pagination.total_records,
        totalPages: result.pagination.total_pages,
        currentPage: result.pagination.current_page
      },
      message: `Found **${result.pagination.total_records}** epics (page ${result.pagination.current_page}/${result.pagination.total_pages}).`
    };
  })
  .build();
