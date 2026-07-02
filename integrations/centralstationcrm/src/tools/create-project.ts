import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in CentralStationCRM. Projects are typically created after winning a deal and serve to organize post-sale work and ongoing engagements.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Name of the project'),
      description: z.string().optional().describe('Description of the project'),
      responsibleUserId: z
        .number()
        .optional()
        .describe('ID of the user responsible for this project')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('ID of the created project'),
      projectName: z.string().optional().describe('Project name'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let result = await client.createProject({
      name: ctx.input.projectName,
      description: ctx.input.description,
      user_id: ctx.input.responsibleUserId
    });

    let project = result?.project ?? result;

    return {
      output: {
        projectId: project.id,
        projectName: project.name,
        createdAt: project.created_at
      },
      message: `Created project **${ctx.input.projectName}** (ID: ${project.id}).`
    };
  })
  .build();
