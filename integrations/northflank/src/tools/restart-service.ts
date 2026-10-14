import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let restartService = SlateTool.create(spec, {
  name: 'Restart Service',
  key: 'restart_service',
  description:
    'Restart a running deployment or combined service. Call list_projects and list_services to discover the project and service IDs. A restart may briefly interrupt requests.',
  tags: { destructive: true }
})
  .input(
    z.object({
      teamId: teamIdSchema,
      projectId: z.string().describe('Project ID from list_projects'),
      serviceId: z.string().describe('Deployment or combined service ID from list_services')
    })
  )
  .output(
    z.object({ projectId: z.string(), serviceId: z.string(), restartRequested: z.boolean() })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId:
        ctx.input.teamId ??
        (typeof ctx.config.teamId === 'string' ? ctx.config.teamId : undefined)
    });
    await client.restartService(ctx.input.projectId, ctx.input.serviceId);
    return {
      output: {
        projectId: ctx.input.projectId,
        serviceId: ctx.input.serviceId,
        restartRequested: true
      },
      message: `Restart requested for service **${ctx.input.serviceId}**.`
    };
  })
  .build();
