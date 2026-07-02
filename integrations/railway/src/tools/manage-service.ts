import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getServiceTool = SlateTool.create(spec, {
  name: 'Get Service',
  key: 'get_service',
  description: `Retrieve detailed information about a Railway service, including its environment-specific configuration (build settings, deploy settings, replicas, etc.) when an environment ID is provided.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID to get environment-specific configuration')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('Service ID'),
      name: z.string().describe('Service name'),
      icon: z.string().nullable().describe('Service icon'),
      projectId: z.string().describe('Parent project ID'),
      createdAt: z.string().describe('Creation timestamp'),
      instance: z
        .object({
          serviceName: z.string().nullable(),
          startCommand: z.string().nullable(),
          buildCommand: z.string().nullable(),
          rootDirectory: z.string().nullable(),
          healthcheckPath: z.string().nullable(),
          region: z.string().nullable(),
          numReplicas: z.number().nullable(),
          restartPolicyType: z.string().nullable(),
          latestDeployment: z
            .object({
              deploymentId: z.string(),
              status: z.string(),
              createdAt: z.string()
            })
            .nullable()
        })
        .nullable()
        .describe('Environment-specific configuration (only when environmentId is provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let service = await client.getService(ctx.input.serviceId);

    let instance: any = null;
    if (ctx.input.environmentId) {
      let inst = await client.getServiceInstance(ctx.input.serviceId, ctx.input.environmentId);
      instance = {
        serviceName: inst.serviceName ?? null,
        startCommand: inst.startCommand ?? null,
        buildCommand: inst.buildCommand ?? null,
        rootDirectory: inst.rootDirectory ?? null,
        healthcheckPath: inst.healthcheckPath ?? null,
        region: inst.region ?? null,
        numReplicas: inst.numReplicas ?? null,
        restartPolicyType: inst.restartPolicyType ?? null,
        latestDeployment: inst.latestDeployment
          ? {
              deploymentId: inst.latestDeployment.id,
              status: inst.latestDeployment.status,
              createdAt: inst.latestDeployment.createdAt
            }
          : null
      };
    }

    return {
      output: {
        serviceId: service.id,
        name: service.name,
        icon: service.icon ?? null,
        projectId: service.projectId,
        createdAt: service.createdAt,
        instance
      },
      message: `Service **${service.name}**${instance?.latestDeployment ? ` — latest deployment status: ${instance.latestDeployment.status}` : ''}.`
    };
  })
  .build();

export let createServiceTool = SlateTool.create(spec, {
  name: 'Create Service',
  key: 'create_service',
  description: `Create a new service in a Railway project. Optionally connect it to a GitHub repo or Docker image.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('Project ID to create the service in'),
      name: z.string().optional().describe('Service name'),
      repo: z
        .string()
        .optional()
        .describe('GitHub repository to connect (format: "owner/repo")'),
      image: z.string().optional().describe('Docker image to deploy (e.g., "postgres:16")')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('ID of the newly created service'),
      name: z.string().describe('Service name'),
      projectId: z.string().describe('Parent project ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let source: { repo?: string; image?: string } | undefined;
    if (ctx.input.repo) {
      source = { repo: ctx.input.repo };
    } else if (ctx.input.image) {
      source = { image: ctx.input.image };
    }

    let service = await client.createService({
      projectId: ctx.input.projectId,
      name: ctx.input.name,
      source
    });

    return {
      output: {
        serviceId: service.id,
        name: service.name,
        projectId: service.projectId
      },
      message: `Created service **${service.name}**.`
    };
  })
  .build();

export let updateServiceTool = SlateTool.create(spec, {
  name: 'Update Service',
  key: 'update_service',
  description: `Update a Railway service's metadata (name, icon) and environment-specific settings (build command, start command, replicas, region, health check, etc.). Provide an environment ID to update environment-specific settings.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to update'),
      name: z.string().optional().describe('New service name'),
      icon: z.string().optional().describe('New service icon'),
      environmentId: z
        .string()
        .optional()
        .describe('Environment ID for environment-specific settings'),
      startCommand: z.string().optional().describe('Start command for the service'),
      buildCommand: z.string().optional().describe('Build command for the service'),
      rootDirectory: z.string().optional().describe('Root directory for the service source'),
      healthcheckPath: z.string().optional().describe('HTTP path for health checks'),
      numReplicas: z.number().optional().describe('Number of replicas'),
      region: z.string().optional().describe('Deployment region'),
      cronSchedule: z.string().optional().describe('Cron schedule expression for cron jobs')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('ID of the updated service'),
      name: z.string().describe('Service name'),
      updated: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let serviceMetaUpdate: { name?: string; icon?: string } = {};
    if (ctx.input.name) serviceMetaUpdate.name = ctx.input.name;
    if (ctx.input.icon) serviceMetaUpdate.icon = ctx.input.icon;

    let serviceName = ctx.input.name || ctx.input.serviceId;

    if (Object.keys(serviceMetaUpdate).length > 0) {
      let result = await client.updateService(ctx.input.serviceId, serviceMetaUpdate);
      serviceName = result.name;
    }

    if (ctx.input.environmentId) {
      let instanceUpdate: Record<string, any> = {};
      if (ctx.input.startCommand !== undefined)
        instanceUpdate.startCommand = ctx.input.startCommand;
      if (ctx.input.buildCommand !== undefined)
        instanceUpdate.buildCommand = ctx.input.buildCommand;
      if (ctx.input.rootDirectory !== undefined)
        instanceUpdate.rootDirectory = ctx.input.rootDirectory;
      if (ctx.input.healthcheckPath !== undefined)
        instanceUpdate.healthcheckPath = ctx.input.healthcheckPath;
      if (ctx.input.numReplicas !== undefined)
        instanceUpdate.numReplicas = ctx.input.numReplicas;
      if (ctx.input.region !== undefined) instanceUpdate.region = ctx.input.region;
      if (ctx.input.cronSchedule !== undefined)
        instanceUpdate.cronSchedule = ctx.input.cronSchedule;

      if (Object.keys(instanceUpdate).length > 0) {
        await client.updateServiceInstance(
          ctx.input.serviceId,
          ctx.input.environmentId,
          instanceUpdate
        );
      }
    }

    return {
      output: {
        serviceId: ctx.input.serviceId,
        name: serviceName,
        updated: true
      },
      message: `Updated service **${serviceName}**.`
    };
  })
  .build();

export let deleteServiceTool = SlateTool.create(spec, {
  name: 'Delete Service',
  key: 'delete_service',
  description: `Permanently delete a Railway service. This removes all deployments and configuration for the service. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the service was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteService(ctx.input.serviceId);

    return {
      output: { deleted: true },
      message: `Service deleted successfully.`
    };
  })
  .build();
