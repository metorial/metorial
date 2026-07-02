import { SlateTool } from 'slates';
import { z } from 'zod';
import { AhaClient } from '../lib/client';
import { spec } from '../spec';

export let listFeatures = SlateTool.create(spec, {
  name: 'List Features',
  key: 'list_features',
  description: `List features from Aha!, optionally filtered by product, release, epic, tag, or assignee. Returns feature names, reference numbers, statuses, and assignment details. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      productId: z.string().optional().describe('Filter by product ID or reference prefix'),
      releaseId: z.string().optional().describe('Filter by release ID or reference number'),
      epicId: z.string().optional().describe('Filter by epic ID or reference number'),
      tag: z.string().optional().describe('Filter by tag'),
      assignedToUser: z.string().optional().describe('Filter by assignee email'),
      updatedSince: z
        .string()
        .optional()
        .describe('Only return features updated since this date (ISO 8601)'),
      page: z.number().optional().describe('Page number (1-indexed)'),
      perPage: z.number().optional().describe('Records per page (max 200)')
    })
  )
  .output(
    z.object({
      features: z.array(
        z.object({
          featureId: z.string().describe('Feature ID'),
          referenceNum: z.string().describe('Feature reference number'),
          name: z.string().describe('Feature name'),
          status: z.string().optional().describe('Workflow status name'),
          assignee: z.string().optional().describe('Assigned user name'),
          startDate: z.string().optional().describe('Start date'),
          dueDate: z.string().optional().describe('Due date'),
          url: z.string().optional().describe('Aha! URL'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      ),
      totalRecords: z.number().describe('Total number of features'),
      totalPages: z.number().describe('Total number of pages'),
      currentPage: z.number().describe('Current page number')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AhaClient(ctx.config.subdomain, ctx.auth.token);

    let result = await client.listFeatures({
      productId: ctx.input.productId,
      releaseId: ctx.input.releaseId,
      epicId: ctx.input.epicId,
      tag: ctx.input.tag,
      assignedToUser: ctx.input.assignedToUser,
      updatedSince: ctx.input.updatedSince,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let features = result.features.map(f => ({
      featureId: f.id,
      referenceNum: f.reference_num,
      name: f.name,
      status: f.workflow_status?.name,
      assignee: f.assigned_to_user?.name,
      startDate: f.start_date,
      dueDate: f.due_date,
      url: f.url,
      updatedAt: f.updated_at
    }));

    return {
      output: {
        features,
        totalRecords: result.pagination.total_records,
        totalPages: result.pagination.total_pages,
        currentPage: result.pagination.current_page
      },
      message: `Found **${result.pagination.total_records}** features (page ${result.pagination.current_page}/${result.pagination.total_pages}).`
    };
  })
  .build();
