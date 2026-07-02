import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let startProjectTracking = SlateTool.create(spec, {
  name: 'Start Project Tracking',
  key: 'start_project_tracking',
  description: `Start tracking time for a given project and optionally a specific task in DeskTime. Useful for automating time tracking when starting work on a project, such as when a ticket is assigned or a task begins.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project to start tracking'),
      taskName: z
        .string()
        .optional()
        .describe('Optional task name within the project to track')
    })
  )
  .output(
    z.object({
      rawResponse: z.any().describe('API response from DeskTime')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.startTracking(ctx.input.projectName, ctx.input.taskName);

    let taskLabel = ctx.input.taskName ? ` / task **${ctx.input.taskName}**` : '';

    return {
      output: {
        rawResponse: response
      },
      message: `Started tracking time for project **${ctx.input.projectName}**${taskLabel}.`
    };
  })
  .build();
