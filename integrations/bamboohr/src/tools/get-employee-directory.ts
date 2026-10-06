import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientFor } from '../lib/client';
import { spec } from '../spec';

export let getEmployeeDirectory = SlateTool.create(spec, {
  name: 'Get Employee Directory',
  key: 'get_employee_directory',
  description: `Retrieve employee directory entries visible under the company's directory sharing settings. This is a permission-limited directory, not a complete employee roster or headcount.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      fieldNames: z.array(z.any()).describe('The field definitions used in the directory'),
      employees: z
        .array(z.record(z.string(), z.any()))
        .describe('List of employee directory entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = clientFor(ctx);

    let data = await client.getEmployeeDirectory();

    return {
      output: {
        fieldNames: data.fields,
        employees: data.employees
      },
      message: `Retrieved directory with **${data.employees.length}** employees.`
    };
  })
  .build();
