import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { accountIdInput, createDbtCloudClient } from './common';

export let listEnvironmentsTool = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all environments for a given dbt Cloud project. Returns environment names, types, dbt versions, and configuration details. Useful for inspecting available deployment targets and their settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...accountIdInput,
      projectId: z.string().describe('The project ID to list environments for'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of environments to return (max 100)'),
      offset: z.number().optional().describe('Number of environments to skip for pagination'),
      orderBy: z
        .string()
        .optional()
        .describe('Field to order results by (prefix with - for descending, e.g., "-id")'),
      name: z.string().optional().describe('Exact environment name filter'),
      nameContains: z.string().optional().describe('Case-insensitive environment name filter'),
      state: z
        .enum(['active', 'deleted', 'all'])
        .optional()
        .describe('Filter by soft deletion state'),
      type: z.string().optional().describe('Environment type filter'),
      deploymentType: z
        .enum(['production', 'staging'])
        .optional()
        .describe('Deployment type filter'),
      dbtVersion: z.string().optional().describe('Filter by dbt version'),
      dbtVersions: z.array(z.string()).optional().describe('Filter by dbt version list'),
      includeRelated: z
        .array(z.enum(['project', 'connection', 'credentials', 'repository']))
        .optional()
        .describe('Related resources to include in each environment response')
    })
  )
  .output(
    z.object({
      environments: z
        .array(
          z.object({
            environmentId: z.number().describe('Unique environment identifier'),
            projectId: z.number().describe('Project the environment belongs to'),
            name: z.string().describe('Environment name'),
            type: z
              .string()
              .optional()
              .describe('Environment type (e.g., deployment, development)'),
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
            credentialsId: z
              .number()
              .nullable()
              .optional()
              .describe('Associated credentials ID'),
            state: z
              .number()
              .optional()
              .describe('Environment state (1 = active, 2 = deleted)'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            updatedAt: z.string().optional().describe('Last update timestamp')
          })
        )
        .describe('List of environments')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDbtCloudClient(ctx);

    let environments = await client.listEnvironments(ctx.input.projectId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      order_by: ctx.input.orderBy,
      name: ctx.input.name,
      name__icontains: ctx.input.nameContains,
      state: ctx.input.state,
      type: ctx.input.type,
      deployment_type: ctx.input.deploymentType,
      dbt_version: ctx.input.dbtVersion,
      dbt_version__in: ctx.input.dbtVersions,
      include_related: ctx.input.includeRelated?.join(',')
    });

    let mapped = environments.map((e: any) => ({
      environmentId: e.id,
      projectId: e.project_id,
      name: e.name,
      type: e.type,
      dbtVersion: e.dbt_version,
      useCustomBranch: e.use_custom_branch,
      customBranch: e.custom_branch ?? null,
      credentialsId: e.credentials_id ?? null,
      state: e.state,
      createdAt: e.created_at,
      updatedAt: e.updated_at
    }));

    return {
      output: { environments: mapped },
      message: `Found **${mapped.length}** environment(s) in project ${ctx.input.projectId}.`
    };
  })
  .build();
