import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let stopProjectTracking = SlateTool.create(spec, {
  name: 'Stop Project Tracking',
  key: 'stop_project_tracking',
  description: `Stop tracking time for a given project and optionally a specific task in DeskTime. Useful for automating time tracking when finishing work on a project, such as when a ticket is closed or a task is completed.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project to stop tracking'),
      taskName: z
        .string()
        .optional()
        .describe('Optional task name within the project to stop tracking')
    })
  )
  .output(
    z.object({
      stopped: z.boolean().describe('Whether DeskTime confirmed that tracking stopped'),
      requestTime: z
        .union([z.string(), z.number()])
        .optional()
        .describe('DeskTime request timestamp'),
      rawResponse: z.any().describe('API response from DeskTime')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.stopTracking(ctx.input.projectName, ctx.input.taskName);

    let taskLabel = ctx.input.taskName ? ` / task **${ctx.input.taskName}**` : '';

    return {
      output: {
        stopped: true,
        requestTime:
          typeof response.__request_time === 'string' ||
          typeof response.__request_time === 'number'
            ? response.__request_time
            : undefined,
        rawResponse: response
      },
      message: `Stopped tracking time for project **${ctx.input.projectName}**${taskLabel}.`
    };
  })
  .build();
