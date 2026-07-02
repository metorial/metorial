import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { opsgenieServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageService = SlateTool.create(spec, {
  name: 'Manage Service',
  key: 'manage_service',
  description: `Create, update, or delete a service. Services represent business services impacted by incidents. Only available on Standard and Enterprise plans.`,
  instructions: [
    'To create: set action to "create" and provide name and teamId.',
    'To update: set action to "update" and provide serviceId and name (required for update).',
    'To delete: set action to "delete" and provide serviceId.'
  ],
  constraints: ['Requires Standard or Enterprise plan.']
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      serviceId: z.string().optional().describe('Service ID (required for update/delete)'),
      name: z
        .string()
        .optional()
        .describe('Service name (required for create and update, max 100 chars)'),
      teamId: z.string().optional().describe('Team ID (required for create)'),
      description: z.string().optional().describe('Service description'),
      tags: z.array(z.string()).optional().describe('Service tags (max 20)')
    })
  )
  .output(
    z.object({
      serviceId: z.string().optional().describe('Service ID'),
      name: z.string().optional().describe('Service name'),
      result: z.string().describe('Operation result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.name || !ctx.input.teamId) {
          throw opsgenieServiceError('name and teamId are required when creating a service.');
        }
        let service = await client.createService({
          name: ctx.input.name,
          teamId: ctx.input.teamId,
          description: ctx.input.description,
          tags: ctx.input.tags
        });
        return {
          output: {
            serviceId: service.id,
            name: service.name ?? ctx.input.name,
            result: 'Service created successfully'
          },
          message: `Created service **${ctx.input.name}**`
        };
      }
      case 'update': {
        if (!ctx.input.serviceId || !ctx.input.name) {
          throw opsgenieServiceError(
            'serviceId and name are required when updating a service.'
          );
        }
        let updated = await client.updateService(ctx.input.serviceId, {
          name: ctx.input.name,
          description: ctx.input.description,
          tags: ctx.input.tags
        });
        return {
          output: {
            serviceId: updated.id ?? ctx.input.serviceId,
            name: updated.name ?? ctx.input.name,
            result: 'Service updated successfully'
          },
          message: `Updated service **${ctx.input.name}**`
        };
      }
      case 'delete': {
        if (!ctx.input.serviceId) {
          throw opsgenieServiceError('serviceId is required when deleting a service.');
        }
        await client.deleteService(ctx.input.serviceId);
        return {
          output: {
            result: 'Service deleted successfully'
          },
          message: `Deleted service \`${ctx.input.serviceId}\``
        };
      }
    }
  })
  .build();
