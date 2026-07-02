import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmployee = SlateTool.create(spec, {
  name: 'Get Employee',
  key: 'get_employee',
  description: `Retrieve detailed employee information from SAP SuccessFactors. Fetches a single employee by user ID, including personal data, employment details, and optionally expanded navigation properties like job info and compensation.`,
  instructions: [
    'Use the userId field from SuccessFactors (not a numeric ID)',
    'Use the expand parameter to fetch related data like "EmpJob" or "EmpCompensation" in one request'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('The SuccessFactors user ID of the employee'),
      select: z
        .string()
        .optional()
        .describe(
          'Comma-separated list of fields to return (e.g., "userId,firstName,lastName,email")'
        ),
      expand: z
        .string()
        .optional()
        .describe(
          'Comma-separated navigation properties to expand (e.g., "EmpJob,EmpCompensation,personalInfoNav")'
        )
    })
  )
  .output(
    z.object({
      employee: z
        .record(z.string(), z.unknown())
        .describe('The employee record with all requested fields')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiServerUrl: ctx.auth.apiServerUrl
    });

    let employee = await client.getEmployee(ctx.input.userId, {
      select: ctx.input.select,
      expand: ctx.input.expand
    });

    return {
      output: { employee },
      message: `Retrieved employee **${(employee as Record<string, unknown>).defaultFullName || ctx.input.userId}**`
    };
  })
  .build();
