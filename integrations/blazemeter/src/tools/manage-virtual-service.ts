import { SlateTool } from 'slates';
import { z } from 'zod';
import { MockServiceClient } from '../lib/mock-client';
import { spec } from '../spec';

export let manageVirtualService = SlateTool.create(spec, {
  name: 'Manage Virtual Service',
  key: 'manage_virtual_service',
  description: `Create, update, delete, list, deploy, or undeploy virtual services (mock services) for service virtualization. Virtual services simulate real services for testing purposes.`,
  instructions: [
    'Use "list" to see all virtual services in a workspace.',
    'Use "create" to set up a new virtual service with mock responses.',
    'Use "deploy" or "undeploy" to control the service lifecycle.',
    'Use "delete" to remove a virtual service.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'update', 'delete', 'deploy', 'undeploy'])
        .describe('Operation to perform'),
      workspaceId: z.number().optional().describe('Workspace ID (required for list/create)'),
      serviceId: z
        .number()
        .optional()
        .describe('Virtual service ID (required for update/delete/deploy/undeploy)'),
      name: z.string().optional().describe('Service name'),
      description: z.string().optional().describe('Service description'),
      serviceUrl: z.string().optional().describe('URL the mock service listens on'),
      thinkTime: z
        .number()
        .optional()
        .describe('Artificial delay in ms between request and response'),
      unmatchedRequestPolicy: z
        .enum(['error', 'redirect'])
        .optional()
        .describe('What to do with non-matching requests'),
      liveSystemUrl: z
        .string()
        .optional()
        .describe('URL of the live service for request redirection')
    })
  )
  .output(
    z.object({
      services: z
        .array(
          z.object({
            serviceId: z.number().describe('Virtual service ID'),
            name: z.string().describe('Service name'),
            status: z.string().optional().describe('Service status'),
            serviceUrl: z.string().optional().describe('Service URL')
          })
        )
        .optional()
        .describe('List of virtual services'),
      serviceId: z.number().optional().describe('Virtual service ID'),
      name: z.string().optional().describe('Service name'),
      status: z.string().optional().describe('Service status'),
      deleted: z.boolean().optional().describe('Whether the service was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MockServiceClient({
      token: ctx.auth.token,
      apiKeyId: ctx.auth.apiKeyId,
      apiKeySecret: ctx.auth.apiKeySecret
    });

    if (ctx.input.action === 'list') {
      if (!ctx.input.workspaceId)
        throw new Error('workspaceId is required for listing virtual services');
      let services = await client.listVirtualServices(ctx.input.workspaceId);
      let mapped = services.map((s: any) => ({
        serviceId: s.id,
        name: s.name,
        status: s.status,
        serviceUrl: s.serviceUrl
      }));
      return {
        output: { services: mapped },
        message: `Found **${mapped.length}** virtual service(s).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.workspaceId || !ctx.input.name) {
        throw new Error('workspaceId and name are required for creating a virtual service');
      }
      let service = await client.createVirtualService(ctx.input.workspaceId, {
        name: ctx.input.name,
        description: ctx.input.description,
        serviceUrl: ctx.input.serviceUrl,
        thinkTime: ctx.input.thinkTime,
        unmatchedRequestPolicy: ctx.input.unmatchedRequestPolicy,
        liveSystemUrl: ctx.input.liveSystemUrl
      });
      return {
        output: { serviceId: service.id, name: service.name, status: service.status },
        message: `Created virtual service **${service.name}** (ID: ${service.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.serviceId)
        throw new Error('serviceId is required for updating a virtual service');
      let service = await client.updateVirtualService(ctx.input.serviceId, {
        name: ctx.input.name,
        description: ctx.input.description,
        serviceUrl: ctx.input.serviceUrl,
        thinkTime: ctx.input.thinkTime,
        unmatchedRequestPolicy: ctx.input.unmatchedRequestPolicy,
        liveSystemUrl: ctx.input.liveSystemUrl
      });
      return {
        output: { serviceId: service.id, name: service.name, status: service.status },
        message: `Updated virtual service **${service.name}** (ID: ${service.id}).`
      };
    }

    if (ctx.input.action === 'deploy') {
      if (!ctx.input.serviceId)
        throw new Error('serviceId is required for deploying a virtual service');
      let _result = await client.deployVirtualService(ctx.input.serviceId);
      return {
        output: { serviceId: ctx.input.serviceId, status: 'deployed' },
        message: `Deployed virtual service **${ctx.input.serviceId}**.`
      };
    }

    if (ctx.input.action === 'undeploy') {
      if (!ctx.input.serviceId)
        throw new Error('serviceId is required for undeploying a virtual service');
      let _result = await client.undeployVirtualService(ctx.input.serviceId);
      return {
        output: { serviceId: ctx.input.serviceId, status: 'undeployed' },
        message: `Undeployed virtual service **${ctx.input.serviceId}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.serviceId)
        throw new Error('serviceId is required for deleting a virtual service');
      await client.deleteVirtualService(ctx.input.serviceId);
      return {
        output: { serviceId: ctx.input.serviceId, deleted: true },
        message: `Deleted virtual service **${ctx.input.serviceId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
