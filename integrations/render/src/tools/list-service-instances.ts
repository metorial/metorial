import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let listServiceInstances = SlateTool.create(spec, {
  name: 'List Service Instances',
  key: 'list_service_instances',
  description: `List the currently known instances for a Render service. Useful for checking active instance IDs and creation timestamps before inspecting metrics or operational state.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('The service ID (e.g., srv-abc123)')
    })
  )
  .output(
    z.object({
      instances: z.array(
        z.object({
          instanceId: z.string().describe('Service instance ID'),
          createdAt: z.string().optional().describe('Instance creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);
    let data = await client.listServiceInstances(ctx.input.serviceId);
    let instances = (Array.isArray(data) ? data : []).map((instance: any) => ({
      instanceId: instance.id,
      createdAt: instance.createdAt
    }));

    return {
      output: { instances },
      message: `Found **${instances.length}** instance(s) for service \`${ctx.input.serviceId}\`.`
    };
  })
  .build();
