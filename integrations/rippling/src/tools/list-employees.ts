import { SlateTool } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

let employeeSchema = z.object({
  employeeId: z.string().describe('Unique employee identifier'),
  name: z.string().optional().describe('Full name of the employee'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  workEmail: z.string().optional().describe('Work email address'),
  personalEmail: z.string().optional().describe('Personal email address'),
  employmentType: z
    .string()
    .optional()
    .describe('Employment type (e.g. full-time, part-time, contractor)'),
  title: z.string().optional().describe('Job title'),
  department: z.string().optional().describe('Department name or ID'),
  roleState: z.string().optional().describe('Role state (e.g. Active, Terminated)'),
  startDate: z.string().optional().describe('Employment start date'),
  endDate: z.string().optional().describe('Employment end date'),
  phone: z.string().optional().describe('Phone number'),
  workLocation: z.any().optional().describe('Work location details'),
  isManager: z.boolean().optional().describe('Whether the employee is a manager'),
  uniqueId: z.string().optional().describe('Permanent unique profile number for the employee')
});

export let listEmployees = SlateTool.create(spec, {
  name: 'List Employees',
  key: 'list_employees',
  description: `Retrieve a list of employees from Rippling. Can list only active employees or include terminated employees as well. Supports pagination for large result sets.`,
  instructions: [
    'Set includeTerminated to true to also retrieve employees who have left the company.',
    'Use limit and offset for pagination. Maximum limit is 100 per request.',
    'The uniqueId field is the recommended identifier for mapping employees across systems.'
  ],
  constraints: [
    'Maximum of 100 employees per request.',
    'Returned fields depend on the scopes granted to the API token or OAuth app.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeTerminated: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include terminated employees in the results'),
      sendAllRoles: z
        .boolean()
        .optional()
        .describe(
          'When including terminated employees, set to true to return all roles regardless of provisioning rules'
        ),
      limit: z.number().optional().describe('Maximum number of employees to return (max 100)'),
      offset: z.number().optional().describe('Number of employees to skip for pagination')
    })
  )
  .output(
    z.object({
      employees: z.array(employeeSchema).describe('List of employees'),
      count: z.number().describe('Number of employees returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RipplingClient({ token: ctx.auth.token });

    let employees: any[];

    if (ctx.input.includeTerminated) {
      employees = await client.listAllEmployees({
        limit: ctx.input.limit,
        offset: ctx.input.offset,
        sendAllRoles: ctx.input.sendAllRoles
      });
    } else {
      employees = await client.listEmployees({
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
    }

    let normalized = (Array.isArray(employees) ? employees : []).map((emp: any) => ({
      employeeId: emp.id || emp.roleId || '',
      name: emp.name,
      firstName: emp.firstName,
      lastName: emp.lastName,
      workEmail: emp.workEmail,
      personalEmail: emp.personalEmail,
      employmentType: emp.employmentType,
      title: emp.title,
      department: emp.department,
      roleState: emp.roleState,
      startDate: emp.startDate,
      endDate: emp.endDate,
      phone: emp.phone || emp.phoneNumber,
      workLocation: emp.workLocation,
      isManager: emp.isManager,
      uniqueId: emp.uniqueId
    }));

    return {
      output: {
        employees: normalized,
        count: normalized.length
      },
      message: `Retrieved **${normalized.length}** employee(s)${ctx.input.includeTerminated ? ' (including terminated)' : ''}.`
    };
  })
  .build();
