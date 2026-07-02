import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateEmployee = SlateTool.create(spec, {
  name: 'Update Employee',
  key: 'update_employee',
  description: `Update one or more fields on an existing employee record. Pass the employee ID and the fields to update. Both standard fields (firstName, lastName, jobTitle, department, etc.) and custom fields are supported.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The employee ID to update'),
      fields: z
        .record(z.string(), z.any())
        .describe(
          'Fields to update as key-value pairs (e.g., { "jobTitle": "Senior Engineer", "department": "Engineering" })'
        )
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The updated employee ID'),
      updatedFields: z.array(z.string()).describe('List of field names that were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    await client.updateEmployee(ctx.input.employeeId, ctx.input.fields);

    let fieldNames = Object.keys(ctx.input.fields);

    return {
      output: {
        employeeId: ctx.input.employeeId,
        updatedFields: fieldNames
      },
      message: `Updated **${fieldNames.length}** field(s) on employee **${ctx.input.employeeId}**: ${fieldNames.join(', ')}.`
    };
  })
  .build();
