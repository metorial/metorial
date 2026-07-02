import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new project in a Motion workspace. Projects act as containers for tasks and can have their own due dates, descriptions, labels, and priorities.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the project'),
      workspaceId: z.string().describe('ID of the workspace to create the project in'),
      dueDate: z.string().optional().describe('ISO 8601 due date for the project'),
      description: z.string().optional().describe('Project description. Accepts HTML.'),
      labels: z.array(z.string()).optional().describe('Label names to attach to the project'),
      priority: z
        .enum(['ASAP', 'HIGH', 'MEDIUM', 'LOW'])
        .optional()
        .describe('Priority level. Defaults to MEDIUM.')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique identifier of the created project'),
      name: z.string().describe('Name of the project'),
      description: z.string().optional().describe('HTML description'),
      workspaceId: z.string().optional().describe('Workspace ID'),
      status: z.any().optional().describe('Project status'),
      createdTime: z.string().optional().describe('When the project was created'),
      updatedTime: z.string().optional().describe('When the project was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let project = await client.createProject({
      name: ctx.input.name,
      workspaceId: ctx.input.workspaceId,
      dueDate: ctx.input.dueDate,
      description: ctx.input.description,
      labels: ctx.input.labels,
      priority: ctx.input.priority
    });

    return {
      output: {
        projectId: project.id,
        name: project.name,
        description: project.description,
        workspaceId: project.workspaceId,
        status: project.status,
        createdTime: project.createdTime,
        updatedTime: project.updatedTime
      },
      message: `Created project **${project.name}**`
    };
  })
  .build();
