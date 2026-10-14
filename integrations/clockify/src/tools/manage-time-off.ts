import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient } from '../lib/client';
import { workspaceIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTimeOffRequests = SlateTool.create(spec, {
  name: 'Get Time Off Requests',
  key: 'get_time_off_requests',
  description: `List time off requests in the workspace. Filter by status, users, and date range. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      status: z
        .enum(['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'])
        .optional()
        .describe('Filter by request status'),
      userIds: z.array(z.string()).optional().describe('Filter by user IDs'),
      start: z.string().optional().describe('Filter requests starting after this date'),
      end: z.string().optional().describe('Filter requests ending before this date'),
      page: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(1)
        .max(1000)
        .optional()
        .describe('Page number'),
      pageSize: z
        .number()
        .refine(Number.isSafeInteger, 'Must be a safe integer')
        .min(1)
        .max(200)
        .optional()
        .describe('Entries per page')
    })
  )
  .output(
    z.object({
      requests: z.array(
        z.object({
          requestId: z.string(),
          userId: z.string().optional(),
          policyId: z.string().optional(),
          status: z.string().optional(),
          start: z.string().optional(),
          end: z.string().optional(),
          note: z.string().optional(),
          halfDay: z.boolean().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    if (ctx.input.status === 'WITHDRAWN') {
      throw createApiServiceError(
        'Clockify does not support filtering time off requests by WITHDRAWN. Use PENDING, APPROVED, or REJECTED.'
      );
    }
    if (Boolean(ctx.input.start) !== Boolean(ctx.input.end)) {
      throw createApiServiceError(
        'Provide both start and end to filter time off requests by date range.'
      );
    }
    let requests = await client.getTimeOffRequests({
      statuses: ctx.input.status ? [ctx.input.status] : undefined,
      users: ctx.input.userIds,
      start: ctx.input.start,
      end: ctx.input.end,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let mapped = (requests.requests ?? []).map((r: any) => ({
      requestId: r.id,
      userId: r.userId || undefined,
      policyId: r.policyId || undefined,
      status: typeof r.status === 'string' ? r.status : (r.status?.statusType ?? undefined),
      start: r.timeOffPeriod?.period?.start || r.start || undefined,
      end: r.timeOffPeriod?.period?.end || r.end || undefined,
      note: r.note || undefined,
      halfDay: r.timeOffPeriod?.halfDay ?? r.halfDay
    }));

    return {
      output: { requests: mapped, count: mapped.length },
      message: `Retrieved **${mapped.length}** time off requests.`
    };
  })
  .build();

export let createTimeOffRequest = SlateTool.create(spec, {
  name: 'Create Time Off Request',
  key: 'create_time_off_request',
  description: `Submit a new time off request in Clockify. Requires a time off policy, date range, and optional notes. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      policyId: z.string().describe('ID of the time off policy to use'),
      start: z.string().describe('Start date in ISO 8601 format'),
      end: z.string().describe('End date in ISO 8601 format'),
      note: z.string().optional().describe('Note or reason for the request'),
      halfDay: z.boolean().optional().describe('Whether this is a half-day request'),
      halfDayPeriod: z
        .enum(['FIRST_HALF', 'SECOND_HALF'])
        .optional()
        .describe('Required when halfDay is true: first or second half of the day')
    })
  )
  .output(
    z.object({
      requestId: z.string(),
      status: z.string().optional(),
      start: z.string().optional(),
      end: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    if (ctx.input.halfDay && !ctx.input.halfDayPeriod) {
      throw createApiServiceError('Provide halfDayPeriod when halfDay is true.');
    }
    let request = await client.createTimeOffRequest({
      policyId: ctx.input.policyId,
      start: ctx.input.start.split('T')[0] ?? ctx.input.start,
      end: ctx.input.end.split('T')[0] ?? ctx.input.end,
      note: ctx.input.note,
      halfDay: ctx.input.halfDay,
      halfDayPeriod: ctx.input.halfDayPeriod
    });

    if (!request?.id) {
      throw createApiServiceError(
        'Clockify returned a created time off request without an ID.'
      );
    }
    return {
      output: {
        requestId: request.id,
        status:
          typeof request.status === 'string'
            ? request.status
            : (request.status?.statusType ?? undefined),
        start: request.timeOffPeriod?.period?.start || request.start || undefined,
        end: request.timeOffPeriod?.period?.end || request.end || undefined
      },
      message: `Created time off request.`
    };
  })
  .build();

export let updateTimeOffRequestStatus = SlateTool.create(spec, {
  name: 'Update Time Off Request Status',
  key: 'update_time_off_request_status',
  description: `Approve or reject a time off request in Clockify. Withdrawal is not supported by this status endpoint. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      requestId: z.string().describe('ID of the time off request'),
      policyId: z
        .string()
        .optional()
        .describe(
          'Policy ID for the request. Call get_time_off_requests to discover request policy IDs.'
        ),
      status: z
        .enum(['APPROVED', 'REJECTED', 'WITHDRAWN'])
        .describe('New status for the request'),
      note: z.string().optional().describe('Note explaining the status change')
    })
  )
  .output(
    z.object({
      requestId: z.string(),
      status: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    if (!ctx.input.policyId) {
      throw createApiServiceError(
        'Provide policyId for the request. Call get_time_off_requests to discover it.'
      );
    }
    if (ctx.input.status === 'WITHDRAWN') {
      throw createApiServiceError(
        'Clockify does not support WITHDRAWN on the time off status endpoint. Use APPROVED or REJECTED.'
      );
    }
    let request = await client.updateTimeOffRequestStatus(
      ctx.input.policyId,
      ctx.input.requestId,
      {
        status: ctx.input.status,
        note: ctx.input.note
      }
    );

    return {
      output: {
        requestId: request?.id || ctx.input.requestId,
        status:
          typeof request?.status === 'string'
            ? request.status
            : (request?.status?.statusType ?? ctx.input.status)
      },
      message: `Time off request **${ctx.input.requestId}** status updated to **${ctx.input.status}**.`
    };
  })
  .build();

export let getTimeOffPolicies = SlateTool.create(spec, {
  name: 'Get Time Off Policies',
  key: 'get_time_off_policies',
  description: `List time off policies configured in the Clockify workspace. Returns policy names and settings. Call get_workspaces to discover the workspace ID.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      workspaceId: workspaceIdSchema,
      page: z.number().int().min(1).max(1000).optional().describe('Page number'),
      pageSize: z.number().int().min(1).max(200).optional().describe('Entries per page')
    })
  )
  .output(
    z.object({
      policies: z.array(
        z.object({
          policyId: z.string(),
          name: z.string(),
          archived: z.boolean().optional()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createApiClient(ctx);

    let policies = await client.getTimeOffPolicies({
      page: ctx.input.page,
      'page-size': ctx.input.pageSize
    });

    let mapped = (policies as any[]).map((p: any) => ({
      policyId: p.id,
      name: p.name,
      archived: p.archived
    }));

    return {
      output: { policies: mapped, count: mapped.length },
      message: `Retrieved **${mapped.length}** time off policies.`
    };
  })
  .build();
