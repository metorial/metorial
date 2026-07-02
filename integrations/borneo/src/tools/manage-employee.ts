import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageEmployee = SlateTool.create(spec, {
  name: 'Manage Employee',
  key: 'manage_employee',
  description: `Create, retrieve, update, list, or delete employee records. Supports personal information, job details, department assignment, and organizational structure for HR integration.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'update', 'delete'])
        .describe('Action to perform'),
      employeeId: z
        .string()
        .optional()
        .describe('Employee ID (required for get, update, delete)'),
      name: z.string().optional().describe('Employee first name'),
      surname: z.string().optional().describe('Employee surname'),
      createdBy: z.string().optional().describe('Creator identifier'),
      email: z.string().optional().describe('Employee email address'),
      department: z.string().optional().describe('Department name or ID'),
      position: z.string().optional().describe('Job position/title'),
      referenceId: z.string().optional().describe('External reference ID'),
      page: z.number().optional().describe('Page number for listing'),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      search: z.string().optional().describe('Search term for filtering')
    })
  )
  .output(
    z
      .object({
        employee: z.any().optional().describe('Employee record'),
        employees: z.array(z.any()).optional().describe('List of employee records'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, employeeId } = ctx.input;

    switch (action) {
      case 'create': {
        if (!ctx.input.name || !ctx.input.surname || !ctx.input.createdBy) {
          throw new Error(
            'name, surname, and createdBy are required for creating an employee'
          );
        }
        let result = await client.createEmployee({
          name: ctx.input.name,
          surname: ctx.input.surname,
          createdBy: ctx.input.createdBy,
          email: ctx.input.email,
          department: ctx.input.department,
          position: ctx.input.position,
          referenceId: ctx.input.referenceId
        });
        let data = result?.data ?? result;
        return {
          output: { employee: data, success: true },
          message: `Employee **${ctx.input.name} ${ctx.input.surname}** created${data?.id ? ` with ID **${data.id}**` : ''}.`
        };
      }
      case 'get': {
        if (!employeeId) throw new Error('employeeId is required for get action');
        let result = await client.getEmployee(employeeId);
        let data = result?.data ?? result;
        return {
          output: { employee: data, success: true },
          message: `Retrieved employee **${employeeId}**.`
        };
      }
      case 'list': {
        let result = await client.listEmployees({
          page: ctx.input.page,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder,
          search: ctx.input.search
        });
        let data = result?.data ?? result;
        let employees = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
        return {
          output: { employees, success: true },
          message: `Found **${employees.length}** employee(s).`
        };
      }
      case 'update': {
        if (!employeeId) throw new Error('employeeId is required for update action');
        let updatePayload: Record<string, any> = {};
        if (ctx.input.name !== undefined) updatePayload.name = ctx.input.name;
        if (ctx.input.surname !== undefined) updatePayload.surname = ctx.input.surname;
        if (ctx.input.email !== undefined) updatePayload.email = ctx.input.email;
        if (ctx.input.department !== undefined)
          updatePayload.department = ctx.input.department;
        if (ctx.input.position !== undefined) updatePayload.position = ctx.input.position;
        if (ctx.input.referenceId !== undefined)
          updatePayload.referenceId = ctx.input.referenceId;

        let result = await client.updateEmployee(employeeId, updatePayload);
        let data = result?.data ?? result;
        return {
          output: { employee: data, success: true },
          message: `Employee **${employeeId}** updated.`
        };
      }
      case 'delete': {
        if (!employeeId) throw new Error('employeeId is required for delete action');
        await client.deleteEmployee(employeeId);
        return {
          output: { success: true },
          message: `Employee **${employeeId}** deleted.`
        };
      }
    }
  })
  .build();
