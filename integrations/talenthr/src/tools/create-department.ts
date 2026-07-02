import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDepartment = SlateTool.create(spec, {
  name: 'Create Department',
  key: 'create_department',
  description: `Create a new department in TalentHR. Departments are organizational units used to group employees and structure the company hierarchy.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the department to create')
    })
  )
  .output(
    z.object({
      departmentId: z.number().describe('ID of the created department'),
      name: z.string().describe('Name of the created department'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createDepartment(ctx.input.name);

    return {
      output: {
        departmentId: response.data.id,
        name: ctx.input.name,
        rawResponse: response
      },
      message: `Successfully created department **${ctx.input.name}**.`
    };
  })
  .build();
