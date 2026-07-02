import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProjectTool = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new Basecamp project with a name and optional description. The project is created with all default tools enabled.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the new project'),
      description: z.string().optional().describe('Description of the project (supports HTML)')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the newly created project'),
      name: z.string().describe('Name of the created project'),
      description: z.string().nullable().describe('Description of the created project'),
      url: z.string().describe('URL of the project in Basecamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let project = await client.createProject({
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        projectId: project.id,
        name: project.name,
        description: project.description ?? null,
        url: project.app_url ?? project.url
      },
      message: `Created project **${project.name}**.`
    };
  })
  .build();
