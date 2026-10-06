import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { invalid } from '../lib/contracts';
import { spec } from '../spec';

export const getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Resolve the authenticated caller using employee ID 0, requesting only first and last name. An integration account without an employee record returns employeeId 0 and employeeBound=false; this does not identify an employee or grant access to employee-specific resources.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      companyDomain: z.string(),
      employeeId: z.string(),
      employeeBound: z.boolean(),
      firstName: z.string().optional(),
      lastName: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    const employee = await clientFor(ctx).getEmployee('0', ['firstName', 'lastName']);
    const employeeBound = employee.id !== '0';
    return {
      output: {
        companyDomain: ctx.auth.companyDomain,
        employeeId: employee.id,
        employeeBound,
        ...(typeof employee.firstName === 'string' ? { firstName: employee.firstName } : {}),
        ...(typeof employee.lastName === 'string' ? { lastName: employee.lastName } : {})
      },
      message: employeeBound
        ? `Resolved caller employee **${employee.id}**. Names may be omitted by permissions.`
        : 'The caller has no bound employee record. Use an exact visible employee ID for employee-specific operations.'
    };
  })
  .build();

export const listResources = SlateTool.create(spec, {
  key: 'list_resources',
  name: 'List Resources',
  description:
    'Discover internal employee IDs, current saved report IDs, or active application status IDs. Returns one native page. Employee fields and counts are permission-sensitive; do not present a partial page or inaccessible values as complete company headcount. Current report IDs require reportSource=current in get_company_report; legacy IDs are a separate namespace.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resourceType: z.enum(['employees', 'reports', 'application_statuses']),
      limit: z.number().default(250).describe('Employee page size, 1–2500'),
      after: z.string().optional().describe('Employee cursor from the previous nextCursor'),
      page: z.number().default(1).describe('Report page number, starting at 1'),
      pageSize: z.number().default(500).describe('Report page size, 1–1000')
    })
  )
  .output(
    z.object({
      resourceType: z.string(),
      resources: z.array(z.record(z.string(), z.unknown())),
      total: z.number().optional(),
      pagination: z.record(z.string(), z.unknown()).optional(),
      nextCursor: z.string().nullable().optional(),
      nextPage: z.number().nullable().optional(),
      reportSource: z.literal('current').optional()
    })
  )
  .handleInvocation(async ctx => {
    const client = clientFor(ctx);
    if (ctx.input.resourceType === 'employees') {
      if (ctx.input.page !== 1 || ctx.input.pageSize !== 500)
        invalid('Use after/limit to page employees; report paging does not apply.');
      const data = await client.listEmployees(ctx.input.limit, ctx.input.after);
      const resources = data.resources.map(employee =>
        Object.fromEntries(
          [
            'employeeId',
            'firstName',
            'lastName',
            'preferredName',
            'jobTitleName',
            '_restrictedFields'
          ]
            .filter(key => key in employee)
            .map(key => [key, employee[key]])
        )
      );
      return {
        output: { ...data, resources, resourceType: ctx.input.resourceType },
        message: `Retrieved **${resources.length}** employee identity records. Provider total ${data.total} is permission-sensitive and is not a verified readable headcount.`
      };
    }
    if (ctx.input.after !== undefined || ctx.input.limit !== 250)
      invalid('after/limit apply only to employee discovery.');
    if (ctx.input.resourceType === 'reports') {
      const data = await client.listReports(ctx.input.page, ctx.input.pageSize);
      return {
        output: {
          ...data,
          resourceType: ctx.input.resourceType,
          reportSource: 'current' as const
        },
        message: `Retrieved **${data.resources.length}** current saved reports. Use these IDs with reportSource=current.`
      };
    }
    if (ctx.input.page !== 1 || ctx.input.pageSize !== 500)
      invalid('Application statuses are not paginated. Omit report paging.');
    const resources = await client.getApplicationStatuses();
    return {
      output: { resourceType: ctx.input.resourceType, resources },
      message: `Retrieved **${resources.length}** application statuses. Select a status with enabled=true.`
    };
  })
  .build();
