import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmployee = SlateTool.create(spec, {
  name: 'Get Employee',
  key: 'get_employee',
  description: `Retrieve detailed employee information from SAP SuccessFactors. Fetches a single employee by user ID, including personal data, employment details, and optionally expanded navigation properties like job info and compensation.`,
  instructions: [
    'Use the exact userId string returned by search_employees, including numeric-looking IDs',
    'Call get_api_metadata for User to discover exact navigation names before expanding related records'
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
          'Comma-separated User navigation properties from get_api_metadata (for example, manager or hr)'
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
      message: 'Retrieved the employee record.'
    };
  })
  .build();
