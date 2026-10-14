import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
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
      projectId: z.union([z.string(), z.number()]).describe('ID of the created project'),
      projectName: z.string().optional().describe('Name returned for the created project'),
      tasks: z.any().optional().describe('Tasks associated with the created project'),
      rawResponse: z.any().describe('API response from DeskTime')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = await client.createProject(ctx.input.projectName, ctx.input.taskName);
    let project =
      isApiErrorRecord(response) && isApiErrorRecord(response.project)
        ? response.project
        : response;
    if (
      !isApiErrorRecord(project) ||
      (typeof project.id !== 'string' && typeof project.id !== 'number')
    ) {
      throw createApiServiceError(
        'DeskTime did not return the created project ID. Check your account permissions before retrying.',
        {
          reason: 'desktime_invalid_response'
        }
      );
    }

    let taskLabel = ctx.input.taskName ? ` with task **${ctx.input.taskName}**` : '';

    return {
      output: {
        projectId: project.id,
        projectName: typeof project.name === 'string' ? project.name : undefined,
        tasks: project.tasks,
        rawResponse: response
      },
      message: `Created project **${ctx.input.projectName}**${taskLabel}.`
    };
  })
  .build();
