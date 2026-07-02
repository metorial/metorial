import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let getEnvironmentTool = SlateTool.create(spec, {
  name: 'Get Environment',
  key: 'get_environment',
  description: `Retrieve details about a specific dbt Cloud environment, including its type, dbt version, credentials, repository, and branch settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      projectId: z.string().describe('The project ID that owns the environment'),
      environmentId: z.string().describe('The environment ID to retrieve')
    })
  )
  .output(
    z.object({
      environmentId: z.number().describe('Unique environment identifier'),
      projectId: z.number().describe('Project the environment belongs to'),
      name: z.string().describe('Environment name'),
      type: z.string().optional().describe('Environment type'),
      deploymentType: z.string().nullable().optional().describe('Deployment type'),
      dbtVersion: z.string().optional().describe('dbt version used in this environment'),
      useCustomBranch: z
        .boolean()
        .optional()
        .describe('Whether this environment uses a custom branch'),
      customBranch: z
        .string()
        .nullable()
        .optional()
        .describe('Custom branch name if applicable'),
      credentialsId: z.number().nullable().optional().describe('Associated credentials ID'),
      repositoryId: z.number().nullable().optional().describe('Associated repository ID'),
      connectionId: z.number().nullable().optional().describe('Associated connection ID'),
      state: z.number().optional().describe('Environment state (1 = active, 2 = deleted)'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let environment = await client.getEnvironment(
      ctx.input.projectId,
      ctx.input.environmentId
    );

    return {
      output: {
        environmentId: environment.id,
        projectId: environment.project_id,
        name: environment.name,
        type: environment.type,
        deploymentType: environment.deployment_type ?? null,
        dbtVersion: environment.dbt_version,
        useCustomBranch: environment.use_custom_branch,
        customBranch: environment.custom_branch ?? null,
        credentialsId: environment.credentials_id ?? null,
        repositoryId: environment.repository_id ?? null,
        connectionId: environment.connection_id ?? null,
        state: environment.state,
        createdAt: environment.created_at,
        updatedAt: environment.updated_at
      },
      message: `Retrieved environment **${environment.name}** (ID: ${environment.id}).`
    };
  })
  .build();
