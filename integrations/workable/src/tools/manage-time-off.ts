import { SlateTool } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let manageTimeOffTool = SlateTool.create(spec, {
  name: 'Manage Time Off',
  key: 'manage_time_off',
  description: `List time-off categories, view time-off requests, create new requests, and check time-off balances. Use this to manage employee leave and absences in Workable HR.`,
  instructions: [
    'Use "listCategories" to see available time-off types',
    'Use "listRequests" to browse time-off requests, optionally filtered by employee',
    'Use "createRequest" to submit a new time-off request for an employee',
    'Use "getBalances" to check remaining time-off balances for a specific employee'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['listCategories', 'listRequests', 'createRequest', 'getBalances'])
        .describe('The action to perform'),
      employeeId: z
        .string()
        .optional()
        .describe('Employee ID (required for createRequest and getBalances)'),
      status: z.string().optional().describe('Filter requests by status (for listRequests)'),
      limit: z.number().optional().describe('Maximum number of results (for listRequests)'),
      cursor: z.string().optional().describe('Pagination cursor (for listRequests)'),
      categoryId: z.string().optional().describe('Time-off category ID (for createRequest)'),
      startDate: z.string().optional().describe('Start date ISO 8601 (for createRequest)'),
      endDate: z.string().optional().describe('End date ISO 8601 (for createRequest)'),
      notes: z.string().optional().describe('Notes for the request (for createRequest)')
    })
  )
  .output(
    z.object({
      categories: z
        .array(
          z.object({
            categoryId: z.string().optional(),
            name: z.string().optional(),
            kind: z.string().optional()
          })
        )
        .optional()
        .describe('Time-off categories'),
      requests: z
        .array(
          z.object({
            requestId: z.string().optional(),
            employeeId: z.string().optional(),
            categoryName: z.string().optional(),
            startDate: z.string().optional(),
            endDate: z.string().optional(),
            status: z.string().optional(),
            notes: z.string().optional()
          })
        )
        .optional()
        .describe('Time-off requests'),
      createdRequest: z
        .object({
          requestId: z.string().optional(),
          status: z.string().optional()
        })
        .optional()
        .describe('Created request details'),
      balances: z
        .array(
          z.object({
            categoryName: z.string().optional(),
            balance: z.number().optional(),
            used: z.number().optional(),
            total: z.number().optional()
          })
        )
        .optional()
        .describe('Time-off balances'),
      actionPerformed: z.string().describe('Description of action performed'),
      paging: z
        .object({
          next: z.string().optional()
        })
        .optional()
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
        let categories = (result.categories || result.time_off_categories || []).map(
          (c: any) => ({
            categoryId: c.id,
            name: c.name,
            kind: c.kind
          })
        );
        return {
          output: {
            categories,
            actionPerformed: 'Listed time-off categories'
          },
          message: `Found **${categories.length}** time-off categor(ies).`
        };
      }
      case 'listRequests': {
        let result = await client.listTimeOffRequests({
          employee_id: ctx.input.employeeId,
          status: ctx.input.status,
          limit: ctx.input.limit,
          cursor: ctx.input.cursor
        });
        let requests = (result.requests || result.time_off_requests || []).map((r: any) => ({
          requestId: r.id,
          employeeId: r.employee_id,
          categoryName: r.category_name || r.category?.name,
          startDate: r.start_date,
          endDate: r.end_date,
          status: r.status,
          notes: r.notes
        }));
        return {
          output: {
            requests,
            actionPerformed: 'Listed time-off requests',
            paging: result.paging
          },
          message: `Found **${requests.length}** time-off request(s).`
        };
      }
      case 'createRequest': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required for createRequest');
        if (!ctx.input.categoryId) throw new Error('categoryId is required for createRequest');
        if (!ctx.input.startDate) throw new Error('startDate is required for createRequest');
        if (!ctx.input.endDate) throw new Error('endDate is required for createRequest');

        let payload: any = {
          employee_id: ctx.input.employeeId,
          category_id: ctx.input.categoryId,
          start_date: ctx.input.startDate,
          end_date: ctx.input.endDate
        };
        if (ctx.input.notes) payload.notes = ctx.input.notes;

        let result = await client.createTimeOffRequest(payload);
        let req = result.request || result.time_off_request || result;
        return {
          output: {
            createdRequest: {
              requestId: req.id,
              status: req.status
            },
            actionPerformed: 'Created time-off request'
          },
          message: `Created time-off request for employee ${ctx.input.employeeId}.`
        };
      }
      case 'getBalances': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required for getBalances');
        let result = await client.getTimeOffBalances(ctx.input.employeeId);
        let balances = (result.balances || result.time_off_balances || []).map((b: any) => ({
          categoryName: b.category_name || b.category?.name,
          balance: b.balance,
          used: b.used,
          total: b.total
        }));
        return {
          output: {
            balances,
            actionPerformed: 'Retrieved time-off balances'
          },
          message: `Retrieved **${balances.length}** time-off balance(s) for employee ${ctx.input.employeeId}.`
        };
      }
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
