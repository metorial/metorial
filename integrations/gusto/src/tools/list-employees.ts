import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let listEmployees = SlateTool.create(spec, {
  name: 'List Employees',
  key: 'list_employees',
  description: `List employees for a company. Supports filtering by termination status and pagination. Returns employee profiles including names, emails, and employment details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      companyId: z.string().describe('The UUID of the company'),
      terminated: z
        .boolean()
        .optional()
        .describe('If true, include terminated employees. If false, only active employees.'),
      page: z.number().optional().describe('Page number for pagination'),
      per: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      employees: z
        .array(
          z.object({
            employeeId: z.string().describe('UUID of the employee'),
            firstName: z.string().optional().describe('First name'),
            lastName: z.string().optional().describe('Last name'),
            middleInitial: z.string().optional().describe('Middle initial'),
            email: z.string().optional().describe('Email address'),
            department: z.string().optional().describe('Department name'),
            terminated: z.boolean().optional().describe('Whether the employee is terminated'),
            twoPercentShareholder: z
              .boolean()
              .optional()
              .describe('Whether the employee is a 2% shareholder'),
            onboardingStatus: z.string().optional().describe('Onboarding status')
          })
        )
        .describe('List of employees'),
      totalCount: z.number().optional().describe('Total number of employees')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    let params: Record<string, any> = {};
    if (ctx.input.terminated !== undefined) params.terminated = ctx.input.terminated;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.per) params.per = ctx.input.per;

    let result = await client.listEmployees(ctx.input.companyId, params);

    let employees = Array.isArray(result) ? result : result.employees || result;
    let totalCount = Array.isArray(result) ? employees.length : result.total;

    let mapped = employees.map((emp: any) => ({
      employeeId: emp.uuid || emp.id?.toString(),
      firstName: emp.first_name,
      lastName: emp.last_name,
      middleInitial: emp.middle_initial,
      email: emp.email,
      department: emp.department,
      terminated: emp.terminated,
      twoPercentShareholder: emp.two_percent_shareholder,
      onboardingStatus: emp.onboarding_status
    }));

    return {
      output: {
        employees: mapped,
        totalCount
      },
      message: `Found **${mapped.length}** employee(s) for company ${ctx.input.companyId}.`
    };
  })
  .build();
