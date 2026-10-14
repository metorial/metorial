import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageService = SlateTool.create(spec, {
  name: 'Manage Service',
  key: 'manage_service',
  description: `Create, get, update, delete, pause, or resume a Northflank deployment service. Supports configuring instances, ports, and deployment sources.`,
  instructions: [
    'Use action "create" to create a new deployment service from an external image or internal build.',
    'Use action "get" to retrieve detailed service information including build and deployment status.',
    'Use action "pause" or "resume" to control service lifecycle.',
    'Use action "delete" to permanently remove a service.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      teamId: teamIdSchema,
      action: z
        .enum(['create', 'get', 'update', 'delete', 'pause', 'resume'])
        .describe('Operation to perform'),
      projectId: z.string().describe('Project ID the service belongs to'),
      serviceId: z
        .string()
        .optional()
        .describe('Service ID (required for get, update, delete, pause, resume)'),
      name: z.string().optional().describe('Service name (required for create)'),
      description: z.string().optional().describe('Service description'),
      tags: z.array(z.string()).optional().describe('Tags to assign to the service'),
      deploymentPlan: z
        .string()
        .optional()
        .describe('Billing deployment plan ID (required for create)'),
      instances: z.number().optional().describe('Number of instances (required for create)'),
      imagePath: z
        .string()
        .optional()
        .describe('External container image path (for create from external registry)'),
      internalBuild: z
        .object({
          id: z
            .string()
            .describe('Build service ID. Call list_services to discover build services.'),
          branch: z.string().optional().describe('Git branch to deploy'),
          buildSHA: z.string().optional().describe('Commit SHA or latest build to deploy')
        })
        .optional()
        .describe('Internal build source for create; provide this or imagePath'),
      registryCredentials: z
        .string()
        .optional()
        .describe('Registry credentials ID for private images'),
      ports: z
        .array(
          z.object({
            name: z.string().describe('Port name'),
            internalPort: z.number().describe('Internal port number'),
            protocol: z.string().describe('Protocol: HTTP, TCP, or UDP'),
            public: z.boolean().describe('Whether the port is publicly accessible')
          })
        )
        .optional()
        .describe('Port configuration for the service')
    })
  )
  .output(
    z.object({
      serviceId: z.string().optional().describe('Service ID'),
      name: z.string().optional().describe('Service name'),
      serviceType: z.string().optional().describe('Service type'),
      deploymentStatus: z.string().optional().describe('Current deployment status'),
      deleted: z.boolean().optional().describe('Whether the service was deleted'),
      paused: z.boolean().optional().describe('Whether the service was paused'),
      resumed: z.boolean().optional().describe('Whether the service was resumed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId:
        ctx.input.teamId ??
        (typeof ctx.config.teamId === 'string' ? ctx.config.teamId : undefined)
    });

    let {
      action,
      projectId,
      serviceId,
      name,
      description,
      tags,
      deploymentPlan,
      instances,
      imagePath,
      internalBuild,
      registryCredentials,
      ports
    } = ctx.input;

    if (action === 'create') {
      if (!name) throw createApiServiceError('name is required for creating a service');
      if (!deploymentPlan)
        throw createApiServiceError('deploymentPlan is required for creating a service');
      if (!!imagePath === !!internalBuild)
        throw createApiServiceError(
          'Provide exactly one deployment source: imagePath or internalBuild.'
        );

      let deploymentConfig: any = {
        instances: instances ?? 1
      };

      if (imagePath) {
        deploymentConfig.external = {
          imagePath,
          credentials: registryCredentials
        };
      }
      if (internalBuild) deploymentConfig.internal = internalBuild;

      let result = await client.createDeploymentService(projectId, {
        name,
        description,
        tags,
        billing: { deploymentPlan },
        deployment: deploymentConfig,
        ports
      });

      return {
        output: {
          serviceId: result?.id,
          name: result?.name,
          serviceType: result?.serviceType
        },
        message: `Service **${name}** created in project **${projectId}**.`
      };
    }

    if (action === 'get') {
      if (!serviceId) throw createApiServiceError('serviceId is required');
      let result = await client.getService(projectId, serviceId);
      let depStatus = result?.status?.deployment?.status || 'unknown';
      return {
        output: {
          serviceId: result?.id,
          name: result?.name,
          serviceType: result?.serviceType,
          deploymentStatus: depStatus
        },
        message: `Service **${result?.name}** — type: ${result?.serviceType}, deployment status: ${depStatus}.`
      };
    }

    if (action === 'update') {
      if (!serviceId) throw createApiServiceError('serviceId is required for update');
      if (name !== undefined)
        throw createApiServiceError(
          'Service names cannot be changed. Update description or tags instead.'
        );
      let updateData: any = {};
      if (description !== undefined) updateData.description = description;
      if (tags) updateData.tags = tags;
      let result = await client.updateService(projectId, serviceId, updateData);
      return {
        output: {
          serviceId: result?.id || serviceId,
          name: result?.name,
          serviceType: result?.serviceType
        },
        message: `Service **${serviceId}** updated.`
      };
    }

    if (action === 'delete') {
      if (!serviceId) throw createApiServiceError('serviceId is required for delete');
      await client.deleteService(projectId, serviceId);
      return {
        output: {
          serviceId,
          deleted: true
        },
        message: `Service **${serviceId}** deleted.`
      };
    }

    if (action === 'pause') {
      if (!serviceId) throw createApiServiceError('serviceId is required for pause');
      await client.pauseService(projectId, serviceId);
      return {
        output: {
          serviceId,
          paused: true
        },
        message: `Service **${serviceId}** paused.`
      };
    }

    if (action === 'resume') {
      if (!serviceId) throw createApiServiceError('serviceId is required for resume');
      await client.resumeService(projectId, serviceId);
      return {
        output: {
          serviceId,
          resumed: true
        },
        message: `Service **${serviceId}** resumed.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
