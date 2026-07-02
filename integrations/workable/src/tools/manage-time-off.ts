import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { requireWorkableString } from '../lib/errors';
import {
  buildTimeOffRequestBody,
  compact,
  mapTimeOffBalance,
  mapTimeOffCategory,
  mapTimeOffRequest
} from '../lib/shapes';
import { spec } from '../spec';

export let manageTimeOffTool = SlateTool.create(spec, {
  name: 'Manage Time Off',
  key: 'manage_time_off',
  description: `List time-off categories and requests, create time-off requests, check balances, and approve or reject time-off approvals using Workable's /timeoff endpoints.`,
  instructions: [
    'Use "listCategories" to see available time-off types.',
    'Use "listRequests" with fromDate to browse time-off requests.',
    'Use "createRequest" with categoryId, fromDate, and toDate; account tokens also require employeeId and memberId.',
    'Use "getBalances" with employeeId when checking balances through an account token.',
    'Use "updateApproval" with approvalKey and approvalState.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'listCategories',
          'listRequests',
          'createRequest',
          'getBalances',
          'updateApproval'
        ])
        .describe('The action to perform'),
      employeeId: z
        .string()
        .optional()
        .describe('Employee ID for request filters, account-token create, and balances'),
      employeeIds: z
        .array(z.string())
        .optional()
        .describe('Employee IDs filter for listRequests'),
      memberId: z
        .string()
        .optional()
        .describe('Member ID required by account-token create/approval actions'),
      categoryId: z.string().optional().describe('Time-off category ID for createRequest'),
      categoryIds: z
        .array(z.string())
        .optional()
        .describe('Category IDs filter for listRequests'),
      states: z.array(z.string()).optional().describe('State filters for listRequests'),
      fromDate: z
        .string()
        .optional()
        .describe('Start date/time; required for listRequests and createRequest'),
      toDate: z.string().optional().describe('End date/time for listRequests/createRequest'),
      halfDays: z.array(z.string()).optional().describe('Half-day dates for createRequest'),
      note: z.string().optional().describe('Note for createRequest'),
      limit: z
        .union([z.literal(10), z.literal(20), z.literal(50), z.literal(100)])
        .optional()
        .describe('Maximum number of requests to return'),
      offset: z.number().optional().describe('Request pagination offset'),
      approvalKey: z.string().optional().describe('Approval key for updateApproval'),
      approvalState: z
        .enum(['approved', 'rejected'])
        .optional()
        .describe('Approval target state'),
      approverId: z
        .string()
        .optional()
        .describe('Approver member ID required for account-token approval actions')
    })
  )
  .output(
    z.object({
      categories: z.array(z.any()).optional().describe('Time-off categories'),
      requests: z.array(z.any()).optional().describe('Time-off requests'),
      createdRequest: z.any().optional().describe('Created request details'),
      balances: z.array(z.any()).optional().describe('Time-off balances'),
      approval: z.any().optional().describe('Updated approval response'),
      actionPerformed: z.string().describe('Description of action performed'),
      paging: z
        .object({
          next: z.string().optional()
        })
        .optional(),
      totalCount: z.number().optional().describe('Total count returned by Workable')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WorkableClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    switch (ctx.input.action) {
      case 'listCategories': {
        let result = await client.listTimeOffCategories();
        let categories = (result.categories || []).map(mapTimeOffCategory);
        return {
          output: {
            categories,
            actionPerformed: 'Listed time-off categories'
          },
          message: `Found **${categories.length}** time-off categor(ies).`
        };
      }
      case 'listRequests': {
        let fromDate = requireWorkableString(ctx.input.fromDate, 'fromDate', 'listRequests');
        let result = await client.listTimeOffRequests({
          from_date: fromDate,
          to_date: ctx.input.toDate,
          category_ids: ctx.input.categoryIds,
          states: ctx.input.states,
          employee_id: ctx.input.employeeId,
          employee_ids: ctx.input.employeeIds,
          limit: ctx.input.limit,
          offset: ctx.input.offset
        });
        let requests = (result.requests || result.timeoff_requests || []).map(
          mapTimeOffRequest
        );
        return {
          output: {
            requests,
            actionPerformed: 'Listed time-off requests',
            paging: result.paging,
            totalCount: result.total_count ?? result.totalCount
          },
          message: `Found **${requests.length}** time-off request(s).`
        };
      }
      case 'createRequest': {
        requireWorkableString(ctx.input.categoryId, 'categoryId', 'createRequest');
        requireWorkableString(ctx.input.fromDate, 'fromDate', 'createRequest');
        requireWorkableString(ctx.input.toDate, 'toDate', 'createRequest');

        let result = await client.createTimeOffRequest(buildTimeOffRequestBody(ctx.input));
        let request = result.request || result.timeoff_request || result;
        return {
          output: {
            createdRequest: mapTimeOffRequest(request),
            actionPerformed: 'Created time-off request'
          },
          message: `Created time-off request${ctx.input.employeeId ? ` for employee ${ctx.input.employeeId}` : ''}.`
        };
      }
      case 'getBalances': {
        let result = await client.getTimeOffBalances({
          employee_id: ctx.input.employeeId
        });
        let balances = (result.balances || result.timeoff_balances || []).map(
          mapTimeOffBalance
        );
        return {
          output: {
            balances,
            actionPerformed: 'Retrieved time-off balances'
          },
          message: `Retrieved **${balances.length}** time-off balance(s).`
        };
      }
      case 'updateApproval': {
        let approvalKey = requireWorkableString(
          ctx.input.approvalKey,
          'approvalKey',
          'updateApproval'
        );
        let approvalState = requireWorkableString(
          ctx.input.approvalState,
          'approvalState',
          'updateApproval'
        );
        if (!['approved', 'rejected'].includes(approvalState)) {
          throw createApiServiceError('approvalState must be approved or rejected.');
        }

        let approval = await client.updateTimeOffApproval(
          approvalKey,
          compact({
            state: approvalState,
            approver_id: ctx.input.approverId,
            member_id: ctx.input.memberId
          })
        );
        return {
          output: {
            approval,
            actionPerformed: `Updated time-off approval ${approvalKey}`
          },
          message: `Updated time-off approval **${approvalKey}** to ${approvalState}.`
        };
      }
    }
  })
  .build();
