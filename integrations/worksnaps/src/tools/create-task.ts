import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTask = SlateTool.create(spec, {
  name: 'Create Task',
  key: 'create_task',
  description: `Create a new task within a project. Tasks allow teams to organize and track work at a more granular level within projects.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The ID of the project to create the task in'),
      name: z.string().describe('Name of the task'),
      description: z.string().optional().describe('Description of the task')
    })
  )
  .output(
    z.object({
      task: z.record(z.string(), z.unknown()).describe('The newly created task')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let task = await client.createTask(ctx.input.projectId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: { task },
      message: `Created task **${ctx.input.name}** in project **${ctx.input.projectId}**.`
    };
  })
  .build();
