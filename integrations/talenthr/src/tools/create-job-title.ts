import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createJobTitle = SlateTool.create(spec, {
  name: 'Create Job Title',
  key: 'create_job_title',
  description: `Create a new job title in TalentHR. Job titles define the roles available in the organization and can be assigned to employees.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the job title to create')
    })
  )
  .output(
    z.object({
      jobTitleId: z.number().describe('ID of the created job title'),
      name: z.string().describe('Name of the created job title'),
      rawResponse: z.any().optional().describe('Full API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createJobTitle(ctx.input.name);

    return {
      output: {
        jobTitleId: response.data.id,
        name: ctx.input.name,
        rawResponse: response
      },
      message: `Successfully created job title **${ctx.input.name}**.`
    };
  })
  .build();
