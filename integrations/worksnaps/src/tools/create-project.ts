import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in Worksnaps. Projects are the top-level organizational unit for tracking work. After creation, users can be assigned to the project.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the project'),
      description: z.string().optional().describe('Description of the project')
    })
  )
  .output(
    z.object({
      project: z.record(z.string(), z.unknown()).describe('The newly created project')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let project = await client.createProject({
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: { project },
      message: `Created project **${ctx.input.name}**.`
    };
  })
  .build();
