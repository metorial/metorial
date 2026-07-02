import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDepartment = SlateTool.create(spec, {
  name: 'Manage Department',
  key: 'manage_department',
  description: `List, get, create, or update a Ramp department. Departments organize users, cards, and transactions for reporting and policy enforcement.`
})
  .input(
    z.object({
      action: z.enum(['list', 'get', 'create', 'update']).describe('Action to perform'),
      departmentId: z.string().optional().describe('Department ID (required for get, update)'),
      name: z
        .string()
        .optional()
        .describe('Department name (required for create, optional for update)'),
      cursor: z.string().optional().describe('Pagination cursor (for list action)'),
      pageSize: z
        .number()
        .min(2)
        .max(100)
        .optional()
        .describe('Number of results per page (for list action)')
    })
  )
  .output(
    z.object({
      department: z
        .any()
        .optional()
        .describe('Single department object (for get, create, update)'),
      departments: z.array(z.any()).optional().describe('List of departments (for list)'),
      nextCursor: z.string().optional().describe('Cursor for next page (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listDepartments({
        start: ctx.input.cursor,
        pageSize: ctx.input.pageSize
      });
      return {
        output: {
          departments: result.data,
          nextCursor: result.page?.next
        },
        message: `Retrieved **${result.data.length}** departments${result.page?.next ? ' (more pages available)' : ''}.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.departmentId) throw new Error('departmentId is required for get action');
      let department = await client.getDepartment(ctx.input.departmentId);
      return {
        output: { department },
        message: `Retrieved department **${department.name || ctx.input.departmentId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      let department = await client.createDepartment({ name: ctx.input.name });
      return {
        output: { department },
        message: `Created department **${ctx.input.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.departmentId)
        throw new Error('departmentId is required for update action');
      let department = await client.updateDepartment(ctx.input.departmentId, {
        name: ctx.input.name
      });
      return {
        output: { department },
        message: `Updated department **${ctx.input.departmentId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
