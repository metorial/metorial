import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listEnvironmentsTool = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all environments in a Railway project (e.g., production, staging). Each environment maintains its own variables, domains, and deployment configurations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to list environments for')
    })
  )
  .output(
    z.object({
      environments: z.array(
        z.object({
          environmentId: z.string().describe('Environment ID'),
          name: z.string().describe('Environment name'),
          createdAt: z.string().describe('Creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let environments = await client.listEnvironments(ctx.input.projectId);

    let mapped = environments.map((e: any) => ({
      environmentId: e.id,
      name: e.name,
      createdAt: e.createdAt
    }));

    return {
      output: { environments: mapped },
      message: `Found **${mapped.length}** environment(s).`
    };
  })
  .build();

export let getEnvironmentTool = SlateTool.create(spec, {
  name: 'Get Environment',
  key: 'get_environment',
  description: `Get detailed information about an environment including its service instances and their latest deployment status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      environmentId: z.string().describe('ID of the environment to retrieve')
    })
  )
  .output(
    z.object({
      environmentId: z.string().describe('Environment ID'),
      name: z.string().describe('Environment name'),
      createdAt: z.string().describe('Creation timestamp'),
      serviceInstances: z.array(
        z.object({
          serviceInstanceId: z.string().describe('Service instance ID'),
          serviceName: z.string().describe('Service name in this environment'),
          latestDeploymentStatus: z.string().nullable().describe('Latest deployment status')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let env = await client.getEnvironment(ctx.input.environmentId);

    return {
      output: {
        environmentId: env.id,
        name: env.name,
        createdAt: env.createdAt,
        serviceInstances: env.serviceInstances.map((si: any) => ({
          serviceInstanceId: si.id,
          serviceName: si.serviceName,
          latestDeploymentStatus: si.latestDeployment?.status ?? null
        }))
      },
      message: `Environment **${env.name}** has ${env.serviceInstances.length} service instance(s).`
    };
  })
  .build();

export let createEnvironmentTool = SlateTool.create(spec, {
  name: 'Create Environment',
  key: 'create_environment',
  description: `Create a new environment in a Railway project. Optionally clone from an existing environment to copy its configuration and variables.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to create the environment in'),
      name: z.string().describe('Name for the new environment (e.g., "staging", "preview")'),
      sourceEnvironmentId: z
        .string()
        .optional()
        .describe('ID of an existing environment to clone configuration from')
    })
  )
  .output(
    z.object({
      environmentId: z.string().describe('ID of the newly created environment'),
      name: z.string().describe('Environment name'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let env = await client.createEnvironment({
      projectId: ctx.input.projectId,
      name: ctx.input.name,
      sourceEnvironmentId: ctx.input.sourceEnvironmentId
    });

    return {
      output: {
        environmentId: env.id,
        name: env.name,
        createdAt: env.createdAt
      },
      message: `Created environment **${env.name}**.`
    };
  })
  .build();

export let deleteEnvironmentTool = SlateTool.create(spec, {
  name: 'Delete Environment',
  key: 'delete_environment',
  description: `Permanently delete an environment from a Railway project. This removes all environment-specific configurations, variables, and domains. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      environmentId: z.string().describe('ID of the environment to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the environment was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteEnvironment(ctx.input.environmentId);

    return {
      output: { deleted: true },
      message: `Environment deleted successfully.`
    };
  })
  .build();
