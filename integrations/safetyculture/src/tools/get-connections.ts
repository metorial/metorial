import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConnections = SlateTool.create(spec, {
  name: 'Get Connections',
  key: 'get_connections',
  description:
    'Retrieve the groups and organization associated with the authenticated token. Use their IDs with list_users_and_groups to discover organization or group members. Requires Platform management: Groups permission.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      connections: z.array(
        z.object({ id: z.string(), name: z.string().optional(), type: z.string().optional() })
      )
    })
  )
  .handleInvocation(async ctx => {
    let connections = (await new Client({ token: ctx.auth.token }).getConnections()).map(
      (group: any) => ({
        id: group.id,
        name: group.name ?? undefined,
        type: group.type ?? undefined
      })
    );
    return {
      output: { connections },
      message: `Found ${connections.length} group and organization connections.`
    };
  })
  .build();
