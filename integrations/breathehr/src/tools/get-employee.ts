import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmployee = SlateTool.create(spec, {
  name: 'Get Employee',
  key: 'get_employee',
  description: `Retrieve detailed information for a specific employee by their ID. Returns full employee profile including personal details, employment info, department, working pattern, and holiday allowance.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      employeeId: z.string().describe('The ID of the employee to retrieve')
    })
  )
  .output(
    z.object({
      employee: z.record(z.string(), z.any()).describe('Full employee record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.getEmployee(ctx.input.employeeId);

    let employee = result?.employees?.[0] || result?.employee || result;

    return {
      output: { employee },
      message: `Retrieved employee **${employee?.first_name || ''} ${employee?.last_name || ''}** (ID: ${ctx.input.employeeId}).`
    };
  })
  .build();
