import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmployee = SlateTool.create(spec, {
  name: 'Get Employee',
  key: 'get_employee',
  description: `Retrieve detailed information about a specific employee by their ID. Specify which fields to include in the response — common fields include name, email, job title, department, hire date, status, and more. Use the **Get Account Fields** tool to discover all available field names.`,
  instructions: [
    'Pass the employee ID (use "0" to refer to the currently authenticated user when using OAuth).',
    'Specify at least one field name to retrieve. Field names are camelCase (e.g., "firstName", "lastName", "workEmail", "jobTitle", "department", "hireDate", "status").'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z
        .string()
        .describe('The employee ID to look up. Use "0" for the current authenticated user.'),
      fields: z
        .array(z.string())
        .describe(
          'List of field names to include (e.g., ["firstName", "lastName", "workEmail", "jobTitle", "department", "hireDate"])'
        )
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID'),
      fields: z
        .record(z.string(), z.any())
        .describe('The requested employee fields and their values')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let data = await client.getEmployee(ctx.input.employeeId, ctx.input.fields);

    return {
      output: {
        employeeId: data.id || ctx.input.employeeId,
        fields: data
      },
      message: `Retrieved employee **${data.displayName || `${data.firstName} ${data.lastName}` || ctx.input.employeeId}** with ${ctx.input.fields.length} fields.`
    };
  })
  .build();
