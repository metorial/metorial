import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmployeeDirectory = SlateTool.create(spec, {
  name: 'Get Employee Directory',
  key: 'get_employee_directory',
  description: `Retrieve the full company employee directory, including all employees' names, contact information, job titles, departments, and other directory fields. Useful for getting an overview of the entire organization.`,
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
    let client = new Client({
      token: ctx.auth.token,
      companyDomain: ctx.config.companyDomain
    });

    let data = await client.getEmployeeDirectory();

    return {
      output: {
        fieldNames: data.fields || [],
        employees: data.employees || []
      },
      message: `Retrieved directory with **${(data.employees || []).length}** employees.`
    };
  })
  .build();
