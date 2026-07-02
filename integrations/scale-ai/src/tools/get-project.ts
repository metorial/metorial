import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve details for a specific Scale AI annotation project by name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project to retrieve')
    })
  )
  .output(
    z
      .object({
        projectName: z.string().describe('Name of the project'),
        taskType: z.string().optional().describe('Task type associated with the project'),
        createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getProject(ctx.input.projectName);

    return {
      output: {
        projectName: result.name ?? ctx.input.projectName,
        taskType: result.type,
        createdAt: result.created_at,
        ...result
      },
      message: `Retrieved project **${ctx.input.projectName}**.`
    };
  })
  .build();
