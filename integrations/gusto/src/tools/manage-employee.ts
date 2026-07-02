import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getBaseUrl } from '../lib/helpers';
import { spec } from '../spec';

export let manageEmployee = SlateTool.create(spec, {
  name: 'Manage Employee',
  key: 'manage_employee',
  description: `Create, update, retrieve, terminate, or rehire a W-2 employee.
- To **create**: provide companyId, firstName, lastName, and optionally other fields.
- To **get** or **update**: provide employeeId and any fields to update.
- To **terminate**: provide employeeId and termination details.
- To **rehire**: provide employeeId and rehire details.`,
  instructions: [
    'When creating, companyId is required along with firstName and lastName.',
    'When updating, employeeId and version are required. Only include fields you want to change.',
    'The version field is required for updates to prevent conflicts (optimistic locking).'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'terminate', 'rehire'])
        .describe('The action to perform'),
      companyId: z.string().optional().describe('Company UUID (required for create)'),
      employeeId: z
        .string()
        .optional()
        .describe('Employee UUID (required for get/update/terminate/rehire)'),
      version: z
        .string()
        .optional()
        .describe('Resource version for optimistic locking (required for update)'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      middleInitial: z.string().optional().describe('Middle initial'),
      email: z.string().optional().describe('Personal email address'),
      dateOfBirth: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
      ssn: z.string().optional().describe('Social Security Number'),
      effectiveDate: z
        .string()
        .optional()
        .describe('Effective date for termination or rehire (YYYY-MM-DD)'),
      runTerminationPayroll: z
        .boolean()
        .optional()
        .describe('Whether to run a termination payroll')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('UUID of the employee'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      version: z.string().optional().describe('Current resource version'),
      onboardingStatus: z.string().optional().describe('Onboarding status'),
      terminated: z.boolean().optional().describe('Whether the employee is terminated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: getBaseUrl(ctx.auth.environment)
    });

    let result: any;
    let actionMessage: string;

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.companyId)
          throw new Error('companyId is required to create an employee');
        result = await client.createEmployee(ctx.input.companyId, {
          first_name: ctx.input.firstName,
          last_name: ctx.input.lastName,
          middle_initial: ctx.input.middleInitial,
          email: ctx.input.email,
          date_of_birth: ctx.input.dateOfBirth,
          ssn: ctx.input.ssn
        });
        actionMessage = `Created employee **${ctx.input.firstName} ${ctx.input.lastName}**`;
        break;
      }
      case 'get': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required');
        result = await client.getEmployee(ctx.input.employeeId);
        actionMessage = `Retrieved employee **${result.first_name} ${result.last_name}**`;
        break;
      }
      case 'update': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required for update');
        let updateData: Record<string, any> = {};
        if (ctx.input.version) updateData.version = ctx.input.version;
        if (ctx.input.firstName) updateData.first_name = ctx.input.firstName;
        if (ctx.input.lastName) updateData.last_name = ctx.input.lastName;
        if (ctx.input.middleInitial) updateData.middle_initial = ctx.input.middleInitial;
        if (ctx.input.email) updateData.email = ctx.input.email;
        if (ctx.input.dateOfBirth) updateData.date_of_birth = ctx.input.dateOfBirth;
        if (ctx.input.ssn) updateData.ssn = ctx.input.ssn;
        result = await client.updateEmployee(ctx.input.employeeId, updateData);
        actionMessage = `Updated employee **${result.first_name} ${result.last_name}**`;
        break;
      }
      case 'terminate': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required for terminate');
        result = await client.terminateEmployee(ctx.input.employeeId, {
          effective_date: ctx.input.effectiveDate,
          run_termination_payroll: ctx.input.runTerminationPayroll
        });
        actionMessage = `Terminated employee ${ctx.input.employeeId} effective ${ctx.input.effectiveDate}`;
        break;
      }
      case 'rehire': {
        if (!ctx.input.employeeId) throw new Error('employeeId is required for rehire');
        result = await client.rehireEmployee(ctx.input.employeeId, {
          effective_date: ctx.input.effectiveDate
        });
        actionMessage = `Rehired employee ${ctx.input.employeeId} effective ${ctx.input.effectiveDate}`;
        break;
      }
    }

    return {
      output: {
        employeeId: result.uuid || result.id?.toString(),
        firstName: result.first_name,
        lastName: result.last_name,
        email: result.email,
        version: result.version,
        onboardingStatus: result.onboarding_status,
        terminated: result.terminated
      },
      message: actionMessage
    };
  })
  .build();
