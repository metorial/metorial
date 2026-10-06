import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getEmployee = SlateTool.create(spec, {
  name: 'Get Employee',
  key: 'get_employee',
  description: `Retrieve detailed information about a specific employee by their ID. Specify which fields to include in the response — common fields include name, email, job title, department, hire date, status, and more. Use the **Get Account Fields** tool to discover all available field names.`,
  instructions: [
    'Use the internal employee ID; "0" resolves the authenticated caller. A service account without an employee record returns only id "0".',
    'Request up to 400 exact field IDs from get_account_fields. Fields omitted because of permissions are not evidence that an employee value is empty.'
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
    let client = clientFor(ctx);

    let data = await client.getEmployee(ctx.input.employeeId, ctx.input.fields);

    return {
      output: {
        employeeId: data.id,
        fields: data
      },
      message: `Retrieved employee **${data.id}**. Requested fields may be omitted by BambooHR permissions.`
    };
  })
  .build();
