import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let manageService = SlateTool.create(spec, {
  name: 'Manage Service',
  key: 'manage_service',
  description: `Perform lifecycle actions on a Render service: **suspend**, **resume**, **restart**, or **delete**. Use this to control service state without modifying its configuration.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('The service ID (e.g., srv-abc123)'),
      action: z
        .enum(['suspend', 'resume', 'restart', 'delete'])
        .describe('The action to perform on the service')
    })
  )
  .output(
    z.object({
      serviceId: z.string().describe('The service ID'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let { serviceId, action } = ctx.input;

    switch (action) {
      case 'suspend':
        await client.suspendService(serviceId);
        break;
      case 'resume':
        await client.resumeService(serviceId);
        break;
      case 'restart':
        await client.restartService(serviceId);
        break;
      case 'delete':
        await client.deleteService(serviceId);
        break;
    }

    return {
      output: {
        serviceId,
        action,
        success: true
      },
      message: `Successfully **${action}${action.endsWith('e') ? 'd' : 'ed'}** service \`${serviceId}\`.`
    };
  })
  .build();
