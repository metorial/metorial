import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { readOne, requireId } from '../lib/response';
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
      employee: z.record(z.string(), z.unknown()).describe('Full employee record')
    })
  )
  .handleInvocation(async ctx => {
    const employeeId = requireId(ctx.input.employeeId, 'employeeId');
    const employee = readOne(
      await new Client({ token: ctx.auth.token, environment: ctx.config.environment }).get(
        'employees',
        employeeId
      ),
      'employees',
      employeeId
    );
    return { output: { employee }, message: 'Retrieved the requested employee.' };
  })
  .build();
