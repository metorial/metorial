import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTimeOffRequests = SlateTool.create(spec, {
  name: 'Get Time Off Requests',
  key: 'get_time_off_requests',
  description: `List time off requests in the workspace. Filter by status, users, and date range.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      status: z
        .enum(['PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN'])
        .optional()
        .describe('Filter by request status'),
      userIds: z
        .array(z.string())
        .optional()
        .describe('Filter by user IDs (comma-separated in API)'),
      start: z.string().optional().describe('Filter requests starting after this date'),
      end: z.string().optional().describe('Filter requests ending before this date'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Entries per page')
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
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let requests = await client.getTimeOffRequests({
      status: ctx.input.status,
      userIds: ctx.input.userIds?.join(','),
      start: ctx.input.start,
      end: ctx.input.end,
      page: ctx.input.page,
      'page-size': ctx.input.pageSize
    });

    let mapped = (requests as any[]).map((r: any) => ({
      requestId: r.id,
      userId: r.userId || undefined,
      policyId: r.policyId || undefined,
      status: r.status?.statusType || r.status || undefined,
      start: r.timeOffPeriod?.start || r.start || undefined,
      end: r.timeOffPeriod?.end || r.end || undefined,
      note: r.note || undefined,
      halfDay: r.halfDay
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
  description: `Submit a new time off request in Clockify. Requires a time off policy, date range, and optional notes.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      policyId: z.string().describe('ID of the time off policy to use'),
      start: z.string().describe('Start date in ISO 8601 format'),
      end: z.string().describe('End date in ISO 8601 format'),
      note: z.string().optional().describe('Note or reason for the request'),
      halfDay: z.boolean().optional().describe('Whether this is a half-day request')
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
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let request = await client.createTimeOffRequest({
      policyId: ctx.input.policyId,
      start: ctx.input.start,
      end: ctx.input.end,
      note: ctx.input.note,
      halfDay: ctx.input.halfDay
    });

    return {
      output: {
        requestId: request.id,
        status: request.status?.statusType || request.status || undefined,
        start: request.timeOffPeriod?.start || request.start || undefined,
        end: request.timeOffPeriod?.end || request.end || undefined
      },
      message: `Created time off request.`
    };
  })
  .build();

export let updateTimeOffRequestStatus = SlateTool.create(spec, {
  name: 'Update Time Off Request Status',
  key: 'update_time_off_request_status',
  description: `Approve, reject, or withdraw a time off request in Clockify.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      requestId: z.string().describe('ID of the time off request'),
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
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let request = await client.updateTimeOffRequestStatus(ctx.input.requestId, {
      status: ctx.input.status,
      note: ctx.input.note
    });

    return {
      output: {
        requestId: request.id || ctx.input.requestId,
        status: request.status?.statusType || request.status || ctx.input.status
      },
      message: `Time off request **${ctx.input.requestId}** status updated to **${ctx.input.status}**.`
    };
  })
  .build();

export let getTimeOffPolicies = SlateTool.create(spec, {
  name: 'Get Time Off Policies',
  key: 'get_time_off_policies',
  description: `List time off policies configured in the Clockify workspace. Returns policy names and settings.`,
  tags: { readOnly: true }
})
  .input(z.object({}))
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
    let client = new Client({
      token: ctx.auth.token,
      workspaceId: ctx.config.workspaceId,
      dataRegion: ctx.config.dataRegion
    });

    let policies = await client.getTimeOffPolicies();

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
