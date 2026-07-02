import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppClient } from '../lib/client';
import { spec } from '../spec';

export let listBroadcasts = SlateTool.create(spec, {
  name: 'List Broadcasts',
  key: 'list_broadcasts',
  description:
    'Retrieve API-triggered broadcasts from your Customer.io workspace, including IDs, state, active status, tags, and message action references.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      broadcasts: z
        .array(
          z.object({
            broadcastId: z.number().describe('The broadcast ID'),
            name: z.string().optional().describe('The broadcast name'),
            type: z.string().optional().describe('The broadcast type'),
            state: z.string().optional().describe('The broadcast state'),
            active: z.boolean().optional().describe('Whether the broadcast is active'),
            createdAt: z.number().optional().describe('Unix timestamp when created'),
            updatedAt: z.number().optional().describe('Unix timestamp when updated'),
            tags: z.array(z.string()).optional().describe('Tags applied to the broadcast')
          })
        )
        .describe('Array of broadcasts')
    })
  )
  .handleInvocation(async ctx => {
    let appClient = new AppClient({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await appClient.listBroadcasts();
    let broadcasts = (result?.broadcasts ?? []).map((broadcast: any) => ({
      broadcastId: broadcast.id,
      name: broadcast.name,
      type: broadcast.type,
      state: broadcast.state,
      active: broadcast.active,
      createdAt: broadcast.created,
      updatedAt: broadcast.updated,
      tags: broadcast.tags
    }));

    return {
      output: { broadcasts },
      message: `Found **${broadcasts.length}** broadcasts.`
    };
  })
  .build();
