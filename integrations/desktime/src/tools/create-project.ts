import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in DeskTime with an optional initial task. Use this to programmatically set up projects for time tracking, enabling integration with external project management or invoicing tools.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project to create'),
      taskName: z
        .string()
        .optional()
        .describe('Optional task name to create within the project')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().describe('API response from DeskTime')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createProject(ctx.input.projectName, ctx.input.taskName);

    let taskLabel = ctx.input.taskName ? ` with task **${ctx.input.taskName}**` : '';

    return {
      output: {
        rawResponse: response
      },
      message: `Created project **${ctx.input.projectName}**${taskLabel}.`
    };
  })
  .build();
