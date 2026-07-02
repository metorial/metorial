import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let getProjectTool = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve details about a specific dbt Cloud project, including repository and connection identifiers. Use this after listing projects when you need the full project record or related resources.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      projectId: z.string().describe('The project ID to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.number().describe('Unique project identifier'),
      name: z.string().describe('Project name'),
      accountId: z.number().describe('Account the project belongs to'),
      connectionId: z.number().nullable().optional().describe('Associated connection ID'),
      repositoryId: z.number().nullable().optional().describe('Associated repository ID'),
      state: z.number().optional().describe('Project state (1 = active, 2 = deleted)'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let project = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: project.id,
        name: project.name,
        accountId: project.account_id,
        connectionId: project.connection_id ?? null,
        repositoryId: project.repository_id ?? null,
        state: project.state,
        createdAt: project.created_at,
        updatedAt: project.updated_at
      },
      message: `Retrieved project **${project.name}** (ID: ${project.id}).`
    };
  })
  .build();
