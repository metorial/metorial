import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
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
      updatedFields: z
        .array(z.string())
        .describe(
          'Fields whose exact submitted values were verified by readback; other fields may be omitted or normalized by the provider'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    const verifiedFields = await client.updateEmployee(ctx.input.employeeId, ctx.input.fields);

    let fieldNames = Object.keys(ctx.input.fields);

    return {
      output: {
        employeeId: ctx.input.employeeId,
        updatedFields: verifiedFields
      },
      message: `BambooHR accepted the employee update. Verified exact values for **${verifiedFields.length}** of **${fieldNames.length}** submitted fields; omitted or normalized values remain unverified.`
    };
  })
  .build();
