import { SlateTool } from 'slates';
import { z } from 'zod';
import { MotionClient } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve a single project by its ID. Returns full project details including status, custom field values, and timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique identifier of the project'),
      name: z.string().describe('Name of the project'),
      description: z.string().optional().describe('HTML description'),
      workspaceId: z.string().optional().describe('Workspace ID'),
      status: z
        .any()
        .optional()
        .describe('Project status with name, isDefaultStatus, and isResolvedStatus'),
      customFieldValues: z
        .any()
        .optional()
        .describe('Custom field values keyed by field name'),
      createdTime: z.string().optional().describe('When the project was created'),
      updatedTime: z.string().optional().describe('When the project was last updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MotionClient({ token: ctx.auth.token });

    let project = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: project.id,
        name: project.name,
        description: project.description,
        workspaceId: project.workspaceId,
        status: project.status,
        customFieldValues: project.customFieldValues,
        createdTime: project.createdTime,
        updatedTime: project.updatedTime
      },
      message: `Retrieved project **${project.name}**`
    };
  })
  .build();
